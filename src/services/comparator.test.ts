import { describe, expect, it } from 'vitest';
import type { Product } from '../types/catalog';
import type { ListItem } from '../types/list';
import type { SelectedPrice } from '../types/prices';
import type { Store } from '../types/stores';
import { compareStores, costMatrix, rowExtremes, type Line } from './comparator';
import type { PriceGetter } from './pricing';

export const store = (id: string): Store => ({
  id,
  name: id,
  enseigne: null,
  address: '',
  city: '',
});
export const product = (id: string, patch: Partial<Product> = {}): Product => ({
  id,
  name: id,
  categoryId: 'epicerie-salee',
  icon: '🛒',
  pack: { count: 1, size: 1, unit: 'piece' },
  soldByWeight: false,
  halal: false,
  references: [],
  ...patch,
});
export const line = (id: string, quantity = 1, patch: Partial<Product> = {}): Line => ({
  product: product(id, patch),
  item: {
    id: `item-${id}`,
    productId: id,
    quantity,
    step: 1,
    categoryId: 'epicerie-salee',
    checked: false,
    updatedAt: '2026-09-28T08:00:00.000Z',
  } satisfies ListItem,
});

/** Prix en centimes par fiche et par magasin ; « ≈ » = relevé d'un autre magasin, « ! » = ancien. */
export function getter(table: Record<string, Record<string, number | string>>): PriceGetter {
  return (productId, storeId) => {
    const raw = table[productId]?.[storeId];
    if (raw === undefined) return null;
    const text = String(raw);
    const selected: SelectedPrice = {
      observation: {
        productId,
        storeId,
        cents: Number(text.replace(/[≈!]/g, '')),
        per: 'pack',
        date: '2026-09-20',
        source: 'open-prices',
        ...(text.includes('≈') ? { fallbackFrom: 'ailleurs' } : {}),
      },
      fallback: text.includes('≈'),
      stale: text.includes('!'),
    };
    return selected;
  };
}

const A = store('A');
const B = store('B');
const C = store('C');

describe('matrice des coûts', () => {
  it('multiplie par la quantité et laisse vide sans prix', () => {
    const matrix = costMatrix(
      [line('riz', 2), line('pates')],
      [A, B],
      getter({ riz: { A: 150 }, pates: { B: 99 } }),
    );
    expect(matrix.map((row) => row.map((c) => c?.cents ?? null))).toEqual([
      [300, null],
      [null, 99],
    ]);
  });
});

describe('comparaison des magasins', () => {
  const lines = [line('riz'), line('pates'), line('huile')];
  const prices = getter({
    riz: { A: 150, B: 120, C: 140 },
    pates: { A: 99, B: 110 },
    huile: { A: '≈350', B: '!390', C: 300 },
  });

  it('en « articles communs », ne compte que les articles connus partout', () => {
    const c = compareStores(lines, [A, B, C], prices, 'communs');
    expect(c.comparedRows).toEqual([0, 2]);
    expect(c.totals.map((t) => [t.storeId, t.totalCents, t.pricedCount])).toEqual([
      ['C', 440, 2],
      ['A', 500, 2],
      ['B', 510, 2],
    ]);
    expect(c.cheapestStoreId).toBe('C');
    expect(c.mostExpensiveStoreId).toBe('B');
    expect(c.savingsCents).toBe(70);
    expect(c.savingsPercent).toBe(14);
    expect(c.totals.find((t) => t.storeId === 'A')).toMatchObject({
      fallbackCount: 1,
      staleCount: 0,
      coverage: 2 / 3,
    });
    expect(c.totals.find((t) => t.storeId === 'B')).toMatchObject({ staleCount: 1 });
  });

  it('en « estimation complète », ne désigne pas moins cher un magasin incomplet', () => {
    const c = compareStores(lines, [A, B, C], prices, 'complet');
    expect(c.totals.map((t) => [t.storeId, t.totalCents, t.pricedCount])).toEqual([
      ['A', 599, 3],
      ['B', 620, 3],
      ['C', 440, 2],
    ]);
    expect(c.comparableIds).toEqual(['A', 'B']);
    expect(c.cheapestStoreId).toBe('A');
    expect(c.savingsCents).toBe(21);
    expect(c.totals[2]!.coverage).toBeCloseTo(2 / 3);
  });

  it('reste prudente sans prix, sans magasin ou avec un seul magasin', () => {
    const none = compareStores(lines, [A, B], getter({}), 'complet');
    expect(none).toMatchObject({
      cheapestStoreId: null,
      mostExpensiveStoreId: null,
      savingsCents: 0,
    });
    expect(compareStores(lines, [], prices, 'communs')).toMatchObject({
      comparedRows: [],
      totals: [],
      cheapestStoreId: null,
    });
    const single = compareStores(lines, [A], prices, 'complet');
    expect(single).toMatchObject({
      cheapestStoreId: 'A',
      mostExpensiveStoreId: null,
      savingsCents: 0,
    });
  });

  it('départage les égalités dans l’ordre de vos magasins', () => {
    const c = compareStores([line('riz')], [B, A], getter({ riz: { A: 100, B: 100 } }), 'communs');
    expect(c.cheapestStoreId).toBe('B');
    expect(c.savingsCents).toBe(0);
  });

  it('repère le prix le plus bas et le plus haut d’une ligne', () => {
    const c = compareStores(lines, [A, B, C], prices, 'complet');
    expect(rowExtremes(c.matrix[0]!)).toEqual({ min: 120, max: 150 });
    expect(rowExtremes([c.matrix[0]![0]!, null])).toBeNull();
  });
});
