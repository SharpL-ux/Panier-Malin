import { describe, expect, it } from 'vitest';
import { getter, line, store } from '../test/builders';
import { compareStores, costMatrix, optimalBasket, rowExtremes } from './comparator';

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

describe('panier optimal', () => {
  const lines = [line('riz'), line('pates'), line('huile')];
  const prices = getter({
    riz: { A: 150, B: 120 },
    pates: { A: 99, B: 110 },
    huile: { A: 350, B: 390, C: 300 },
  });
  const opts = { maxStores: 2, minSavingCents: 300, mainStoreId: 'A' };

  it('ne propose rien sans magasin ou sans article', () => {
    expect(optimalBasket(lines, [], prices, opts)).toBeNull();
    expect(optimalBasket([], [A, B], prices, opts)).toBeNull();
  });

  it('reste dans un seul magasin quand un deuxième ferait économiser moins que le seuil', () => {
    // A seul : 599 ; A + C : 549, soit 50 centimes d'économie, sous le seuil de 3 €.
    const basket = optimalBasket(lines, [A, B, C], prices, opts)!;
    expect(basket).toMatchObject({
      storeIds: ['A'],
      totalCents: 599,
      savingsCents: 0,
      toVerify: [],
    });
  });

  it('répartit entre magasins quand l’économie dépasse le seuil', () => {
    const basket = optimalBasket(lines, [A, B, C], prices, { ...opts, minSavingCents: 0 })!;
    expect(basket.storeIds).toEqual(['B', 'C']);
    expect(basket.totalCents).toBe(530);
    expect(basket.assignments).toEqual({ 'item-riz': 'B', 'item-pates': 'B', 'item-huile': 'C' });
    expect(basket.perStore).toEqual([
      { storeId: 'B', itemIds: ['item-riz', 'item-pates'], totalCents: 230 },
      { storeId: 'C', itemIds: ['item-huile'], totalCents: 300 },
    ]);
    expect(basket.singleStoreId).toBe('A');
    expect(basket.savingsCents).toBe(69);
  });

  it('respecte le nombre maximal de magasins, même plus grand que vos magasins', () => {
    const three = optimalBasket(lines, [A, B, C], prices, {
      ...opts,
      maxStores: 3,
      minSavingCents: 0,
    })!;
    expect(three).toMatchObject({ storeIds: ['A', 'B', 'C'], totalCents: 519 });
    const capped = optimalBasket(lines, [A, B], prices, {
      ...opts,
      maxStores: 3,
      minSavingCents: 0,
    })!;
    expect(capped).toMatchObject({ storeIds: ['A', 'B'], totalCents: 569 });
    const one = optimalBasket(lines, [A, B, C], prices, {
      ...opts,
      maxStores: 1,
      minSavingCents: 0,
    })!;
    expect(one.storeIds).toEqual(['A']);
  });

  it('privilégie les articles couverts et place ceux sans prix chez le magasin principal', () => {
    const sparse = getter({ riz: { B: 120 }, pates: { A: 99 } });
    const basket = optimalBasket([line('riz'), line('pates'), line('sel')], [A, B], sparse, opts)!;
    expect(basket).toMatchObject({ storeIds: ['A', 'B'], coveredCount: 2, toVerify: ['item-sel'] });
    expect(basket.assignments['item-sel']).toBe('A');
    const none = optimalBasket([line('sel')], [A, B], getter({}), { ...opts, mainStoreId: 'B' })!;
    expect(none).toMatchObject({
      storeIds: ['B'],
      toVerify: ['item-sel'],
      totalCents: 0,
      assignments: { 'item-sel': 'B' },
    });
  });

  it('départage les égalités par le magasin principal, puis par l’ordre de vos magasins', () => {
    const same = getter({ riz: { A: 100, B: 100 } });
    expect(
      optimalBasket([line('riz')], [A, B], same, { ...opts, mainStoreId: 'B' })!.storeIds,
    ).toEqual(['B']);
    expect(
      optimalBasket([line('riz')], [A, B], same, { ...opts, mainStoreId: undefined })!.storeIds,
    ).toEqual(['A']);
  });
});
