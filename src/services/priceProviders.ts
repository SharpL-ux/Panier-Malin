import type { EnseigneId, Pack, Product } from '../types/catalog';
import type { ManualPrice, PriceObservation, PriceSource } from '../types/prices';
import type { Store } from '../types/stores';
import { toIsoDate } from '../utils/dates';
import {
  getPricesForList,
  locationLabel,
  type ListPricesRequest,
  type ParsedOpenPrice,
} from './openPrices';
import { priceKey } from './pricing';

export interface PriceRequest {
  products: Product[];
  stores: Store[];
  sameEnseigneFallback: boolean;
  today?: Date;
}

/**
 * Une source de prix. Le comparateur ne connaît que cette interface : on peut ajouter
 * une source (un autre service, une base partagée) sans toucher aux calculs.
 */
export interface PriceProvider {
  readonly source: PriceSource;
  getObservations: (request: PriceRequest, signal?: AbortSignal) => Promise<PriceObservation[]>;
}

/** Les relevés Open Prices sont cherchés sur un an. */
const LOOKBACK_DAYS = 365;

interface CodeTarget {
  product: Product;
  pack: Pack;
  /** Enseigne de la référence ; null pour un produit personnalisé vendu partout. */
  enseigne: EnseigneId | null;
}

/** Codes-barres et catégories à interroger, selon les enseignes de vos magasins. */
export function priceTargets(products: Product[], stores: Store[]) {
  const enseignes = new Set(
    stores.map((s) => s.enseigne).filter((e): e is EnseigneId => e !== null),
  );
  const byCode = new Map<string, CodeTarget[]>();
  const byTag = new Map<string, Product[]>();
  const push = <T>(map: Map<string, T[]>, key: string, value: T) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };
  for (const product of products) {
    for (const ref of product.references) {
      if (ref.ean && enseignes.has(ref.enseigne)) {
        push(byCode, ref.ean, { product, pack: ref.pack ?? product.pack, enseigne: ref.enseigne });
      }
    }
    if (product.ean) push(byCode, product.ean, { product, pack: product.pack, enseigne: null });
    if (product.offCategoryTag) push(byTag, product.offCategoryTag, product);
  }
  return { byCode, byTag };
}

/** Rattache les prix Open Prices à vos fiches et à vos magasins. */
export function observationsFromOpenPrices(
  prices: ParsedOpenPrice[],
  products: Product[],
  stores: Store[],
  sameEnseigneFallback: boolean,
): PriceObservation[] {
  const located = stores.filter((s) => s.locationId !== undefined);
  const storeByLocation = new Map(located.map((s) => [s.locationId, s]));
  const { byCode, byTag } = priceTargets(products, located);
  const out: PriceObservation[] = [];
  for (const price of prices) {
    const exact = price.locationId !== null ? storeByLocation.get(price.locationId) : undefined;
    const base = {
      cents: price.cents,
      date: price.date,
      source: 'open-prices' as const,
      openPricesId: price.id,
    };
    if (price.type === 'PRODUCT' && price.productCode) {
      for (const target of byCode.get(price.productCode) ?? []) {
        const observation = {
          ...base,
          productId: target.product.id,
          per: 'pack' as const,
          pack: target.pack,
        };
        if (exact) {
          if (target.enseigne === null || exact.enseigne === target.enseigne)
            out.push({ ...observation, storeId: exact.id });
          continue;
        }
        const priceEnseigne = price.location?.enseigne ?? null;
        if (!sameEnseigneFallback || !priceEnseigne) continue;
        if (target.enseigne !== null && target.enseigne !== priceEnseigne) continue;
        for (const store of located) {
          if (store.enseigne === priceEnseigne) {
            out.push({
              ...observation,
              storeId: store.id,
              fallbackFrom: locationLabel(price.location),
            });
          }
        }
      }
    } else if (price.type === 'CATEGORY' && price.categoryTag && exact) {
      for (const product of byTag.get(price.categoryTag) ?? []) {
        out.push({ ...base, productId: product.id, storeId: exact.id, per: price.per });
      }
    }
  }
  return out;
}

export function createOpenPricesProvider(
  fetchPrices: (
    request: ListPricesRequest,
    signal?: AbortSignal,
  ) => Promise<ParsedOpenPrice[]> = getPricesForList,
): PriceProvider {
  return {
    source: 'open-prices',
    async getObservations(request, signal) {
      const located = request.stores.filter((s) => s.locationId !== undefined);
      if (located.length === 0) return [];
      const { byCode, byTag } = priceTargets(request.products, located);
      if (byCode.size === 0 && byTag.size === 0) return [];
      const since = new Date(request.today ?? new Date());
      since.setDate(since.getDate() - LOOKBACK_DAYS);
      const prices = await fetchPrices(
        {
          codes: [...byCode.keys()],
          categoryTags: [...byTag.keys()],
          locationIds: located.map((s) => s.locationId!),
          since: toIsoDate(since),
          withFallback: request.sameEnseigneFallback,
        },
        signal,
      );
      return observationsFromOpenPrices(
        prices,
        request.products,
        located,
        request.sameEnseigneFallback,
      );
    },
  };
}

/** Vos prix saisis, sous forme de relevés. */
export function manualObservations(
  prices: Record<string, ManualPrice>,
  products: Product[],
  stores: Store[],
): PriceObservation[] {
  const productIds = new Set(products.map((p) => p.id));
  const storeIds = new Set(stores.map((s) => s.id));
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: PriceObservation[] = [];
  for (const [key, price] of Object.entries(prices)) {
    const [productId, storeId] = key.split('|');
    if (!productId || !storeId || !productIds.has(productId) || !storeIds.has(storeId)) continue;
    out.push({
      productId,
      storeId,
      cents: price.cents,
      per: price.per,
      ...(price.per === 'pack' ? { pack: byId.get(productId)!.pack } : {}),
      date: price.date,
      source: 'manuel',
    });
  }
  return out;
}

export function createManualPriceProvider(
  getPrices: () => Record<string, ManualPrice>,
): PriceProvider {
  return {
    source: 'manuel',
    getObservations: (request) =>
      Promise.resolve(manualObservations(getPrices(), request.products, request.stores)),
  };
}

export { priceKey };
