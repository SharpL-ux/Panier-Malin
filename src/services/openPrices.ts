import type { EnseigneId } from '../types/catalog';
import type { PricePer } from '../types/prices';
import type { Store } from '../types/stores';
import { parseEuroToCents } from '../utils/money';
import { createRateLimiter } from '../utils/rateLimiter';
import { OPEN_PRICES_API_URL, OPEN_PRICES_WEB_URL } from './endpoints';
import { enseigneFromText } from './stores';

/**
 * Accès à l'API Open Prices (https://prices.openfoodfacts.org/api/docs).
 * Les paramètres et champs utilisés ont été vérifiés dans le code source du serveur :
 * pages de 100 éléments au plus (`page`, `size`), prix renvoyés en nombres.
 */

export class OpenPricesError extends Error {}

/** Service gratuit et partagé : on espace les appels. */
const schedule = createRateLimiter(300);

/** Nombre maximal de pages lues par requête, pour ne jamais lancer d'appel en masse. */
const MAX_PAGES = 5;
const CODES_PER_REQUEST = 40;

type Params = Record<string, string | number | undefined>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

async function getJson(path: string, params: Params, signal?: AbortSignal): Promise<unknown> {
  const url = new URL(OPEN_PRICES_API_URL + path);
  for (const [key, value] of Object.entries(params))
    if (value !== undefined) url.searchParams.set(key, String(value));
  const response = await schedule(() => fetch(url, { signal })).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new OpenPricesError(
      'Open Prices est injoignable. Vérifiez votre connexion puis réessayez.',
    );
  });
  if (!response.ok)
    throw new OpenPricesError(`Open Prices a répondu avec une erreur (${response.status}).`);
  return response.json();
}

async function getPaged(
  path: string,
  params: Params,
  signal?: AbortSignal,
  maxPages = MAX_PAGES,
): Promise<unknown[]> {
  const items: unknown[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const body = await getJson(path, { ...params, page, size: 100 }, signal);
    if (!isRecord(body) || !Array.isArray(body.items)) break;
    items.push(...body.items);
    if (typeof body.pages !== 'number' || page >= body.pages) break;
  }
  return items;
}

// ------------------------------------------------------------------ Magasins

export interface OpenPricesLocation {
  id: number;
  name: string;
  brand: string;
  city: string;
  postcode: string;
  enseigne: EnseigneId | null;
}

export function parseLocation(raw: unknown): OpenPricesLocation | null {
  if (!isRecord(raw) || typeof raw.id !== 'number') return null;
  const name = text(raw.osm_name);
  const brand = text(raw.osm_brand);
  return {
    id: raw.id,
    name,
    brand,
    city: text(raw.osm_address_city),
    postcode: text(raw.osm_address_postcode),
    enseigne: enseigneFromText(name, brand),
  };
}

export function locationLabel(location: OpenPricesLocation | undefined): string {
  if (!location) return 'un autre magasin';
  return [location.name || location.brand, location.city].filter(Boolean).join(', ');
}

/** Transforme un magasin Open Prices en magasin de l'application. */
export function locationToStore(raw: unknown): Store | null {
  const location = parseLocation(raw);
  if (!location || !isRecord(raw)) return null;
  // osm_display_name : « Lidl, 12, Rue X, Quartier, Ville, … » ; on garde le numéro et la rue.
  const parts = text(raw.osm_display_name)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const street = parts.slice(1, 3).join(' ').trim();
  const address = [street, [location.postcode, location.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return {
    id: `op-${location.id}`,
    name: location.name || location.brand || 'Magasin',
    enseigne: location.enseigne,
    address,
    city: location.city,
    locationId: location.id,
    ...(typeof raw.osm_lat === 'number' ? { lat: raw.osm_lat } : {}),
    ...(typeof raw.osm_lon === 'number' ? { lon: raw.osm_lon } : {}),
    ...(typeof raw.price_count === 'number' ? { priceCount: raw.price_count } : {}),
  };
}

/** Recherche des magasins par ville ou par nom, les plus renseignés d'abord. */
export async function searchLocations(term: string, signal?: AbortSignal): Promise<Store[]> {
  const query = term.trim();
  if (query.length < 2) return [];
  const common = { type: 'OSM', order_by: '-price_count', size: 20 };
  const [byCity, byName] = await Promise.all([
    getJson('/locations', { ...common, osm_address_city__like: query }, signal),
    getJson('/locations', { ...common, osm_name__like: query }, signal),
  ]);
  const seen = new Map<string, Store>();
  for (const body of [byCity, byName]) {
    const items = isRecord(body) && Array.isArray(body.items) ? body.items : [];
    for (const item of items) {
      const store = locationToStore(item);
      if (store && !seen.has(store.id)) seen.set(store.id, store);
    }
  }
  return [...seen.values()].sort((a, b) => (b.priceCount ?? 0) - (a.priceCount ?? 0)).slice(0, 20);
}

/** Magasins autour d'un point (géolocalisation). */
export async function nearbyLocations(
  lat: number,
  lon: number,
  radiusKm = 3,
  signal?: AbortSignal,
): Promise<Store[]> {
  const body = await getJson(
    '/locations/nearby',
    { lat, lon, radius_km: radiusKm, size: 30 },
    signal,
  );
  const items =
    isRecord(body) && Array.isArray(body.items) ? body.items : Array.isArray(body) ? body : [];
  return items.flatMap((item) => locationToStore(item) ?? []);
}

// ------------------------------------------------------------------ Prix

export interface ParsedOpenPrice {
  id: number;
  type: 'PRODUCT' | 'CATEGORY';
  productCode?: string;
  categoryTag?: string;
  /** Prix hors promotion, en centimes. */
  cents: number;
  per: PricePer;
  date: string;
  locationId: number | null;
  location?: OpenPricesLocation;
}

/**
 * Lit un prix Open Prices. Sont écartés : les autres devises, les doublons signalés,
 * et les prix en promotion dont le prix normal n'est pas connu.
 */
export function parseOpenPrice(raw: unknown): ParsedOpenPrice | null {
  if (!isRecord(raw) || typeof raw.id !== 'number') return null;
  if (raw.currency !== 'EUR' || (raw.duplicate_of !== null && raw.duplicate_of !== undefined))
    return null;
  const type = raw.type === 'PRODUCT' || raw.type === 'CATEGORY' ? raw.type : null;
  if (!type) return null;
  let value = raw.price;
  if (raw.price_is_discounted === true) {
    if (raw.price_without_discount === null || raw.price_without_discount === undefined)
      return null;
    value = raw.price_without_discount;
  }
  const cents =
    typeof value === 'number' || typeof value === 'string' ? parseEuroToCents(value) : null;
  const date = text(raw.date);
  if (cents === null || cents <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const location = parseLocation(raw.location) ?? undefined;
  const locationId = typeof raw.location_id === 'number' ? raw.location_id : (location?.id ?? null);
  return {
    id: raw.id,
    type,
    ...(text(raw.product_code) ? { productCode: text(raw.product_code) } : {}),
    ...(text(raw.category_tag) ? { categoryTag: text(raw.category_tag) } : {}),
    cents,
    per: type === 'PRODUCT' ? 'pack' : raw.price_per === 'UNIT' ? 'piece' : 'kg',
    date,
    locationId,
    ...(location ? { location } : {}),
  };
}

function parseAll(items: unknown[]): ParsedOpenPrice[] {
  const byId = new Map<number, ParsedOpenPrice>();
  for (const item of items) {
    const price = parseOpenPrice(item);
    if (price) byId.set(price.id, price);
  }
  return [...byId.values()];
}

export interface ListPricesRequest {
  /** Codes-barres des références. */
  codes: string[];
  /** Catégories Open Food Facts du vrac. */
  categoryTags: string[];
  /** Vos magasins Open Prices. */
  locationIds: number[];
  /** Date minimale des relevés, AAAA-MM-JJ. */
  since: string;
  /** Chercher aussi les relevés des autres magasins (pour le repli sur la même enseigne). */
  withFallback: boolean;
}

/**
 * Prix de toute une liste en quelques requêtes : les codes-barres par lots de 40,
 * et les prix du vrac de vos magasins en une seule requête.
 */
export async function getPricesForList(
  request: ListPricesRequest,
  signal?: AbortSignal,
): Promise<ParsedOpenPrice[]> {
  const base = {
    currency: 'EUR',
    duplicate_of__isnull: 'true',
    date__gte: request.since,
    order_by: '-date',
  };
  const locations = request.locationIds.join(',');
  const items: unknown[] = [];
  for (let i = 0; i < request.codes.length; i += CODES_PER_REQUEST) {
    const codes = request.codes.slice(i, i + CODES_PER_REQUEST).join(',');
    items.push(
      ...(await getPaged(
        '/prices',
        {
          ...base,
          product_code__in: codes,
          ...(request.withFallback ? {} : { location_id__in: locations }),
        },
        signal,
      )),
    );
  }
  if (request.categoryTags.length > 0 && request.locationIds.length > 0) {
    const tags = new Set(request.categoryTags);
    const raw = await getPaged(
      '/prices',
      { ...base, type: 'CATEGORY', location_id__in: locations },
      signal,
    );
    items.push(...raw.filter((p) => isRecord(p) && tags.has(text(p.category_tag))));
  }
  return parseAll(items);
}

/** Historique des prix d'un code-barres ou d'une catégorie, du plus ancien au plus récent. */
export async function getPriceHistory(
  target: { code: string } | { categoryTag: string; locationIds: number[] },
  since: string,
  signal?: AbortSignal,
): Promise<ParsedOpenPrice[]> {
  const params =
    'code' in target
      ? { product_code: target.code }
      : {
          type: 'CATEGORY',
          category_tag: target.categoryTag,
          location_id__in: target.locationIds.join(','),
        };
  const items = await getPaged(
    '/prices',
    {
      ...params,
      currency: 'EUR',
      duplicate_of__isnull: 'true',
      date__gte: since,
      order_by: 'date',
    },
    signal,
  );
  return parseAll(items).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

/** Page du site Open Prices pour ajouter un prix à partir d'une photo d'étiquette. */
export const OPEN_PRICES_ADD_PRICE_URL = `${OPEN_PRICES_WEB_URL}/prices/add/multiple?proof_type=PRICE_TAG`;

export function openPricesProductUrl(code: string): string {
  return `${OPEN_PRICES_WEB_URL}/products/${code}`;
}
