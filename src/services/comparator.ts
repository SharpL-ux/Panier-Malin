import type { Product } from '../types/catalog';
import type { ListItem } from '../types/list';
import type { SelectedPrice } from '../types/prices';
import type { ComparisonMode, Store } from '../types/stores';
import { itemCost, type PriceGetter } from './pricing';

/** Un article de la liste avec sa fiche. */
export interface Line {
  item: ListItem;
  product: Product;
}

export interface Cell {
  /** Coût de la quantité demandée, en centimes. */
  cents: number;
  selected: SelectedPrice;
}

/** cells[ligne][magasin] : coût de chaque article dans chaque magasin, ou null sans prix comparable. */
export type CostMatrix = (Cell | null)[][];

export function costMatrix(lines: Line[], stores: Store[], priceAt: PriceGetter): CostMatrix {
  return lines.map(({ item, product }) =>
    stores.map((store) => {
      const selected = priceAt(product.id, store.id);
      if (!selected) return null;
      const cents = itemCost(product, item.quantity, selected.observation);
      return cents === null ? null : { cents, selected };
    }),
  );
}

export interface StoreTotal {
  storeId: string;
  totalCents: number;
  /** Articles comptés dans le total. */
  pricedCount: number;
  /** Part de la liste couverte par le total, de 0 à 1. */
  coverage: number;
  /** Prix empruntés à un autre magasin de l'enseigne, et relevés de plus de 3 mois, parmi les articles comptés. */
  fallbackCount: number;
  staleCount: number;
}

export interface Comparison {
  mode: ComparisonMode;
  itemCount: number;
  matrix: CostMatrix;
  /** Indices des lignes comptées (articles communs, ou toutes). */
  comparedRows: number[];
  /** Totaux triés : magasins comparables du moins cher au plus cher, puis les autres. */
  totals: StoreTotal[];
  /** Magasins dont les totaux portent sur les mêmes articles et peuvent être comparés. */
  comparableIds: string[];
  cheapestStoreId: string | null;
  mostExpensiveStoreId: string | null;
  /** Économie du moins cher par rapport au plus cher, en centimes et en pourcentage. */
  savingsCents: number;
  savingsPercent: number;
}

/**
 * Compare vos magasins sur la liste.
 * - « communs » : seuls les articles dont le prix est connu partout comptent ; les totaux sont
 *   directement comparables.
 * - « complet » : tout ce qui est connu compte ; seuls les magasins qui couvrent le plus
 *   d'articles sont départagés, pour ne pas désigner « moins cher » un magasin incomplet.
 */
export function compareStores(
  lines: Line[],
  stores: Store[],
  priceAt: PriceGetter,
  mode: ComparisonMode,
): Comparison {
  const matrix = costMatrix(lines, stores, priceAt);
  const allRows = lines.map((_, i) => i);
  const comparedRows =
    mode === 'communs'
      ? allRows.filter((r) => stores.length > 0 && matrix[r]!.every((c) => c !== null))
      : allRows;

  const totals: StoreTotal[] = stores.map((store, s) => {
    let totalCents = 0;
    let pricedCount = 0;
    let fallbackCount = 0;
    let staleCount = 0;
    for (const r of comparedRows) {
      const cell = matrix[r]![s];
      if (!cell) continue;
      totalCents += cell.cents;
      pricedCount += 1;
      if (cell.selected.fallback) fallbackCount += 1;
      if (cell.selected.stale) staleCount += 1;
    }
    const coverage = lines.length ? pricedCount / lines.length : 0;
    return { storeId: store.id, totalCents, pricedCount, coverage, fallbackCount, staleCount };
  });

  const maxPriced = Math.max(0, ...totals.map((t) => t.pricedCount));
  const order = new Map(stores.map((s, i) => [s.id, i]));
  const byTotal = (a: StoreTotal, b: StoreTotal) =>
    a.totalCents - b.totalCents || order.get(a.storeId)! - order.get(b.storeId)!;
  const comparable =
    maxPriced > 0 ? totals.filter((t) => t.pricedCount === maxPriced).sort(byTotal) : [];
  const others = totals
    .filter((t) => !comparable.includes(t))
    .sort((a, b) => b.pricedCount - a.pricedCount || byTotal(a, b));

  const cheapest = comparable[0] ?? null;
  const dearest = comparable.length > 1 ? comparable[comparable.length - 1]! : null;
  const savingsCents = cheapest && dearest ? dearest.totalCents - cheapest.totalCents : 0;
  return {
    mode,
    itemCount: lines.length,
    matrix,
    comparedRows,
    totals: [...comparable, ...others],
    comparableIds: comparable.map((t) => t.storeId),
    cheapestStoreId: cheapest?.storeId ?? null,
    mostExpensiveStoreId: dearest?.storeId ?? null,
    savingsCents,
    savingsPercent:
      dearest && dearest.totalCents > 0 ? Math.round((savingsCents / dearest.totalCents) * 100) : 0,
  };
}

/** Prix le plus bas et le plus haut d'une ligne, quand au moins deux magasins diffèrent. */
export function rowExtremes(row: (Cell | null)[]): { min: number; max: number } | null {
  const values = row.filter((c): c is Cell => c !== null).map((c) => c.cents);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min < max ? { min, max } : null;
}
