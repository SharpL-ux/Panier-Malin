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

// ------------------------------------------------------------------ Panier optimal

export interface BasketOptions {
  /** Nombre maximal de magasins (1 à 3). */
  maxStores: number;
  /** Économie minimale, en centimes, pour qu'un magasin de plus vaille le déplacement. */
  minSavingCents: number;
  mainStoreId?: string | undefined;
}

export interface BasketStore {
  storeId: string;
  itemIds: string[];
  totalCents: number;
}

export interface Basket {
  storeIds: string[];
  /** Magasin de chaque article, y compris ceux à vérifier (placés chez le magasin principal). */
  assignments: Record<string, string>;
  /** Articles sans prix dans les magasins retenus. */
  toVerify: string[];
  totalCents: number;
  coveredCount: number;
  perStore: BasketStore[];
  /** Meilleur magasin unique, et économie du panier par rapport à lui sur les articles qu'il connaît aussi. */
  singleStoreId: string;
  savingsCents: number;
}

interface Evaluated {
  subset: number[];
  /** Magasin retenu pour chaque ligne (indice), ou -1 sans prix. */
  choice: number[];
  covered: number;
  cost: number;
  score: number;
  hasMain: boolean;
}

/** Combinaisons de 1 à k magasins parmi n, dans l'ordre lexicographique (175 pour 10 magasins et k = 3). */
function* subsets(n: number, k: number): Generator<number[]> {
  function* extend(start: number, current: number[]): Generator<number[]> {
    for (let i = start; i < n; i += 1) {
      const next = [...current, i];
      yield next;
      if (next.length < k) yield* extend(i + 1, next);
    }
  }
  yield* extend(0, []);
}

function evaluate(
  matrix: CostMatrix,
  subset: number[],
  mainIndex: number,
  minSavingCents: number,
): Evaluated {
  const choice: number[] = [];
  let covered = 0;
  let cost = 0;
  for (const row of matrix) {
    let best = -1;
    for (const s of subset) {
      const cell = row[s];
      if (!cell) continue;
      const current = best >= 0 ? row[best] : null;
      if (
        !current ||
        cell.cents < current.cents ||
        (cell.cents === current.cents && s === mainIndex)
      )
        best = s;
    }
    choice.push(best);
    if (best >= 0) {
      covered += 1;
      cost += row[best]!.cents;
    }
  }
  return {
    subset,
    choice,
    covered,
    cost,
    score: cost + (subset.length - 1) * minSavingCents,
    hasMain: subset.includes(mainIndex),
  };
}

/** Plus d'articles couverts, puis coût pénalisé par magasin, puis moins de magasins, puis magasin principal, puis ordre. */
function better(a: Evaluated, b: Evaluated): boolean {
  if (a.covered !== b.covered) return a.covered > b.covered;
  if (a.score !== b.score) return a.score < b.score;
  if (a.subset.length !== b.subset.length) return a.subset.length < b.subset.length;
  if (a.hasMain !== b.hasMain) return a.hasMain;
  for (let i = 0; i < a.subset.length; i += 1)
    if (a.subset[i] !== b.subset[i]) return a.subset[i]! < b.subset[i]!;
  return false;
}

/**
 * Répartition la moins chère de la liste entre au plus `maxStores` magasins. Toutes les
 * combinaisons sont essayées (au plus 175) : le résultat est exact et reproductible.
 * Un magasin de plus n'est retenu que s'il fait économiser au moins `minSavingCents`.
 */
export function optimalBasket(
  lines: Line[],
  stores: Store[],
  priceAt: PriceGetter,
  options: BasketOptions,
): Basket | null {
  if (stores.length === 0 || lines.length === 0) return null;
  const matrix = costMatrix(lines, stores, priceAt);
  const k = Math.max(1, Math.min(Math.floor(options.maxStores), stores.length, 3));
  const mainIndex = stores.findIndex((s) => s.id === options.mainStoreId);
  let best: Evaluated | null = null;
  let single: Evaluated | null = null;
  for (const subset of subsets(stores.length, k)) {
    const evaluated = evaluate(matrix, subset, mainIndex, Math.max(0, options.minSavingCents));
    if (!best || better(evaluated, best)) best = evaluated;
    if (subset.length === 1 && (!single || better(evaluated, single))) single = evaluated;
  }
  if (!best || !single) return null;
  const chosen = best;
  const alone = single;
  const fallbackIndex = chosen.subset.includes(mainIndex) ? mainIndex : chosen.subset[0]!;
  const target = (r: number) => (chosen.choice[r]! >= 0 ? chosen.choice[r]! : fallbackIndex);

  const assignments: Record<string, string> = {};
  const toVerify: string[] = [];
  lines.forEach((line, r) => {
    if (chosen.choice[r]! < 0) toVerify.push(line.item.id);
    assignments[line.item.id] = stores[target(r)]!.id;
  });
  const perStore = chosen.subset.map((s) => ({
    storeId: stores[s]!.id,
    itemIds: lines.filter((_, r) => target(r) === s).map((l) => l.item.id),
    totalCents: lines.reduce(
      (sum, _, r) => (chosen.choice[r] === s ? sum + matrix[r]![s]!.cents : sum),
      0,
    ),
  }));
  let savings = 0;
  matrix.forEach((row, r) => {
    const a = alone.choice[r]!;
    const b = chosen.choice[r]!;
    if (a >= 0 && b >= 0) savings += row[a]!.cents - row[b]!.cents;
  });
  return {
    storeIds: chosen.subset.map((s) => stores[s]!.id),
    assignments,
    toVerify,
    totalCents: chosen.cost,
    coveredCount: chosen.covered,
    perStore,
    singleStoreId: stores[alone.subset[0]!]!.id,
    savingsCents: Math.max(0, savings),
  };
}
