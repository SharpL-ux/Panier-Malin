import type { Product } from '../types/catalog';
import type { PriceObservation, SelectedPrice } from '../types/prices';

export type PriceGetter = (productId: string, storeId: string) => SelectedPrice | null;
import { fromIsoDate } from '../utils/dates';
import { unitPriceCents } from '../utils/money';
import { refQuantity, refUnitOf, round3 } from '../utils/units';

/** Au-delà de trois mois, un relevé est signalé comme ancien. */
export const STALE_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isStale(date: string, today: Date, days: number = STALE_DAYS): boolean {
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const d = fromIsoDate(date);
  return (start - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / DAY_MS > days;
}

/** Besoin exprimé dans l'unité de référence de la fiche : kg, L ou pièces. */
export function needInRefUnit(product: Product, quantity: number): number {
  return product.soldByWeight ? quantity : round3(quantity * refQuantity(product.pack));
}

/**
 * Coût, en centimes, de `quantity` × la fiche d'après un relevé.
 * - Prix d'un conditionnement : on achète des conditionnements entiers (88 couches en paquets de 48 → 2 paquets) ;
 *   au poids, le prix est proratisé.
 * - Prix au kilo ou à la pièce (vrac) : proportionnel au besoin.
 * Renvoie null si le relevé n'est pas comparable (un prix au kilo pour une fiche en litres).
 */
export function itemCost(
  product: Product,
  quantity: number,
  observation: PriceObservation,
): number | null {
  const need = needInRefUnit(product, quantity);
  const unit = refUnitOf(product.pack);
  if (observation.per === 'pack') {
    const pack = observation.pack ?? product.pack;
    if (refUnitOf(pack) !== unit) return null;
    const size = refQuantity(pack);
    if (!(size > 0)) return null;
    if (product.soldByWeight) return Math.round((observation.cents * need) / size);
    return Math.ceil(round3(need / size)) * observation.cents;
  }
  if ((observation.per === 'kg' ? 'kg' : 'piece') !== unit) return null;
  return Math.round(observation.cents * need);
}

/** Prix au kilo, au litre ou à la pièce d'un relevé, en centimes. */
export function unitCents(product: Product, observation: PriceObservation): number | null {
  if (observation.per !== 'pack') return observation.cents;
  return unitPriceCents(observation.cents, refQuantity(observation.pack ?? product.pack));
}

export interface SelectOptions {
  today: Date;
  /** Vos saisies passent avant les relevés Open Prices (par défaut). Sinon, le plus récent gagne. */
  preferManual?: boolean;
  /** Accepter les relevés d'un autre magasin de la même enseigne. */
  allowFallback?: boolean;
  staleDays?: number;
}

const byDateDesc = (a: PriceObservation, b: PriceObservation) =>
  b.date.localeCompare(a.date) || (b.openPricesId ?? 0) - (a.openPricesId ?? 0);

/**
 * Choisit le prix d'une fiche dans un magasin parmi les relevés disponibles :
 * votre saisie, puis le relevé le plus récent du magasin, puis (si autorisé) celui
 * d'un autre magasin de la même enseigne, signalé comme tel.
 */
export function selectPrice(
  candidates: PriceObservation[],
  options: SelectOptions,
): SelectedPrice | null {
  const usable =
    options.allowFallback === false ? candidates.filter((c) => !c.fallbackFrom) : candidates;
  const manual = usable.filter((c) => c.source === 'manuel').sort(byDateDesc);
  const exact = usable.filter((c) => c.source !== 'manuel' && !c.fallbackFrom).sort(byDateDesc);
  const fallback = usable.filter((c) => c.source !== 'manuel' && c.fallbackFrom).sort(byDateDesc);
  const chosen =
    options.preferManual === false
      ? ([...manual, ...exact].sort(byDateDesc)[0] ?? fallback[0])
      : (manual[0] ?? exact[0] ?? fallback[0]);
  if (!chosen) return null;
  return {
    observation: chosen,
    fallback: Boolean(chosen.fallbackFrom),
    stale: isStale(chosen.date, options.today, options.staleDays),
  };
}

export function priceKey(productId: string, storeId: string): string {
  return `${productId}|${storeId}`;
}

/** Regroupe les relevés par fiche et par magasin. */
export function indexObservations(
  observations: PriceObservation[],
): Map<string, PriceObservation[]> {
  const index = new Map<string, PriceObservation[]>();
  for (const o of observations) {
    const key = priceKey(o.productId, o.storeId);
    const list = index.get(key);
    if (list) list.push(o);
    else index.set(key, [o]);
  }
  return index;
}

export interface Offer {
  storeId: string;
  selected: SelectedPrice;
  /** Coût de la quantité demandée dans ce magasin, en centimes. */
  cents: number;
}

/** Magasin le moins cher pour une quantité de la fiche, parmi ceux qui ont un prix comparable. */
export function bestOffer(
  product: Product,
  quantity: number,
  storeIds: string[],
  priceAt: PriceGetter,
): Offer | null {
  let best: Offer | null = null;
  for (const storeId of storeIds) {
    const selected = priceAt(product.id, storeId);
    if (!selected) continue;
    const cents = itemCost(product, quantity, selected.observation);
    if (cents === null) continue;
    if (!best || cents < best.cents || (cents === best.cents && storeId < best.storeId))
      best = { storeId, selected, cents };
  }
  return best;
}
