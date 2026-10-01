import { describe, expect, it } from 'vitest';
import type { Product } from '../types/catalog';
import {
  buildCatalog,
  countByCategory,
  DEFAULT_FILTERS,
  filterProducts,
  referenceAt,
  sortProducts,
} from './catalog';

function make(partial: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    categoryId: 'cremerie',
    icon: '🥛',
    pack: { count: 1, size: 1000, unit: 'ml' },
    soldByWeight: false,
    halal: false,
    references: [],
    ...partial,
  };
}

const products = [
  make({
    id: 'lait',
    name: 'Lait demi-écrémé UHT',
    references: [
      { enseigne: 'lidl', brand: 'Milbona', ean: '' },
      { enseigne: 'carrefour', brand: 'Simpl', ean: '' },
    ],
  }),
  make({ id: 'creme', name: 'Crème fraîche épaisse', pack: { count: 1, size: 200, unit: 'ml' } }),
  make({
    id: 'spaghetti',
    name: 'Spaghetti',
    categoryId: 'epicerie-salee',
    pack: { count: 1, size: 500, unit: 'g' },
  }),
  make({
    id: 'bananes',
    name: 'Bananes',
    categoryId: 'fruits',
    soldByWeight: true,
    pack: { count: 1, size: 1000, unit: 'g' },
  }),
];
const catalog = buildCatalog([], products);
const ids = (list: Product[]) => list.map((p) => p.id);

describe('recherche et filtres', () => {
  it('ignore les accents et la casse', () => {
    expect(ids(filterProducts(catalog, { ...DEFAULT_FILTERS, query: 'CREME epaisse' }))).toEqual([
      'creme',
    ]);
    expect(ids(filterProducts(catalog, { ...DEFAULT_FILTERS, query: 'écrémé' }))).toEqual(['lait']);
  });

  it('retrouve une fiche par la marque d’une de ses références', () => {
    expect(ids(filterProducts(catalog, { ...DEFAULT_FILTERS, query: 'milbona' }))).toEqual([
      'lait',
    ]);
  });

  it('filtre par rayon, ou l’ignore pour compter les résultats de chaque rayon', () => {
    const f = { ...DEFAULT_FILTERS, categoryId: 'fruits' as const };
    expect(ids(filterProducts(catalog, f))).toEqual(['bananes']);
    expect(filterProducts(catalog, f, undefined, { ignoreCategory: true })).toHaveLength(4);
    expect(countByCategory(products).get('cremerie')).toBe(2);
  });

  it('« mes favoris » ne garde que les fiches étoilées', () => {
    const f = { ...DEFAULT_FILTERS, favoritesOnly: true };
    expect(ids(filterProducts(catalog, f, undefined, { favorites: new Set(['bananes']) }))).toEqual(
      ['bananes'],
    );
    expect(filterProducts(catalog, f)).toEqual([]);
  });

  it('« prix connu uniquement » garde les fiches qui ont un prix', () => {
    const prices = { priceOf: (p: Product) => (p.id === 'lait' ? 95 : null) };
    expect(
      ids(filterProducts(catalog, { ...DEFAULT_FILTERS, knownPriceOnly: true }, prices)),
    ).toEqual(['lait']);
  });
});

describe('tri', () => {
  const prices = {
    priceOf: (p: Product) => ({ lait: 95, creme: 89, spaghetti: 79 })[p.id] ?? null,
  };

  it('trie par nom à la française', () => {
    expect(ids(sortProducts(products, 'nom'))).toEqual(['bananes', 'creme', 'lait', 'spaghetti']);
  });

  it('trie par prix, les prix inconnus en dernier', () => {
    expect(ids(sortProducts(products, 'prix', prices))).toEqual([
      'spaghetti',
      'creme',
      'lait',
      'bananes',
    ]);
  });

  it('trie par prix au litre ou au kilo pour comparer des formats différents', () => {
    // 0,89 € les 20 cl = 4,45 €/L ; 0,79 € les 500 g = 1,58 €/kg ; 0,95 €/L.
    expect(ids(sortProducts(products, 'prix-unitaire', prices))).toEqual([
      'lait',
      'spaghetti',
      'creme',
      'bananes',
    ]);
  });

  it('ne modifie pas le tableau d’origine', () => {
    const copy = [...products];
    sortProducts(products, 'prix', prices);
    expect(products).toEqual(copy);
  });
});

describe('références par enseigne', () => {
  it('indique la marque à prendre dans chaque enseigne', () => {
    expect(referenceAt(products[0]!, 'lidl')?.brand).toBe('Milbona');
    expect(referenceAt(products[0]!, 'leclerc')).toBeUndefined();
  });
});

describe('produits personnalisés', () => {
  it('s’ajoutent au catalogue sans jamais remplacer une fiche de base', () => {
    const custom = make({ id: 'perso-1', name: 'Mon produit', custom: true });
    const clash = make({ id: 'lait', name: 'Écrasé ?', custom: true });
    const merged = buildCatalog([custom, clash], products);
    expect(merged.products).toHaveLength(products.length + 1);
    expect(merged.productById.get('lait')?.name).toBe('Lait demi-écrémé UHT');
  });
});
