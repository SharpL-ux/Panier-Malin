import type { Pack } from '../types/catalog';
import { cleanEan, isValidEan } from '../utils/ean';
import { createRateLimiter } from '../utils/rateLimiter';
import { OFF_PRODUCT_URL } from './endpoints';
import { readValue, writeValue } from './storage';

export { OFF_PRODUCT_URL };

const FIELDS = [
  'code',
  'product_name',
  'product_name_fr',
  'brands',
  'image_front_small_url',
  'image_small_url',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'categories_tags',
].join(',');

export interface OffProductInfo {
  ean: string;
  name: string;
  brand: string;
  imageUrl?: string;
  quantityLabel?: string;
  pack?: Pack;
  categoriesTags: string[];
}

export class OffLookupError extends Error {}

/**
 * La documentation Open Food Facts limite la lecture de produits à 15 requêtes par minute
 * et par utilisateur : on espace donc les appels de 4 secondes au minimum.
 */
const schedule = createRateLimiter(4000);

const CACHE_KEY = 'cache:off-produits';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Un produit introuvable peut être ajouté entre-temps : on réessaie le lendemain. */
const MISS_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  at: number;
  info: OffProductInfo | null;
}

function readCache(): Record<string, CacheEntry> {
  return readValue<Record<string, CacheEntry>>(CACHE_KEY, {});
}

/** Convertit la quantité déclarée par Open Food Facts en conditionnement exploitable. */
export function packFromOff(quantity: unknown, unit: unknown): Pack | undefined {
  const value = typeof quantity === 'number' ? quantity : Number.parseFloat(String(quantity ?? ''));
  if (!(value > 0)) return undefined;
  switch (String(unit ?? '').toLowerCase()) {
    case 'g':
      return { count: 1, size: Math.round(value), unit: 'g' };
    case 'kg':
      return { count: 1, size: Math.round(value * 1000), unit: 'g' };
    case 'ml':
      return { count: 1, size: Math.round(value), unit: 'ml' };
    case 'cl':
      return { count: 1, size: Math.round(value * 10), unit: 'ml' };
    case 'l':
      return { count: 1, size: Math.round(value * 1000), unit: 'ml' };
    default:
      return undefined;
  }
}

function toInfo(ean: string, product: Record<string, unknown>): OffProductInfo {
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const image = text(product.image_front_small_url) || text(product.image_small_url);
  const quantity = text(product.quantity);
  return {
    ean,
    name: text(product.product_name_fr) || text(product.product_name),
    brand: text(product.brands).split(',')[0]?.trim() ?? '',
    imageUrl: image || undefined,
    quantityLabel: quantity || undefined,
    pack: packFromOff(product.product_quantity, product.product_quantity_unit),
    categoriesTags: Array.isArray(product.categories_tags)
      ? product.categories_tags.filter((t): t is string => typeof t === 'string')
      : [],
  };
}

/**
 * Récupère nom, marque, image et quantité d'un produit à partir de son code-barres.
 * Renvoie null si le produit n'existe pas dans Open Food Facts.
 */
export async function fetchOffProduct(
  rawEan: string,
  options: { signal?: AbortSignal } = {},
): Promise<OffProductInfo | null> {
  const ean = cleanEan(rawEan);
  if (!isValidEan(ean))
    throw new OffLookupError('Ce code-barres n’est pas valide : vérifiez les chiffres saisis.');

  const cache = readCache();
  const hit = cache[ean];
  if (hit && Date.now() - hit.at < (hit.info ? CACHE_TTL_MS : MISS_TTL_MS)) return hit.info;

  const response = await schedule(() =>
    fetch(`${OFF_PRODUCT_URL}/${ean}?fields=${FIELDS}`, { signal: options.signal }),
  ).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new OffLookupError(
      'Open Food Facts est injoignable. Vérifiez votre connexion puis réessayez.',
    );
  });

  let info: OffProductInfo | null;
  if (response.status === 404) {
    info = null;
  } else if (!response.ok) {
    throw new OffLookupError(
      `Open Food Facts a répondu avec une erreur (${response.status}). Réessayez plus tard.`,
    );
  } else {
    const body = (await response.json()) as { status?: number; product?: Record<string, unknown> };
    info = body.status === 1 && body.product ? toInfo(ean, body.product) : null;
  }

  writeValue(CACHE_KEY, { ...cache, [ean]: { at: Date.now(), info } });
  return info;
}
