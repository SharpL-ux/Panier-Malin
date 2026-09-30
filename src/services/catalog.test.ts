import { describe, expect, it } from 'vitest';
import type { EquivalenceGroup, Product } from '../types/catalog';
import {
  buildCatalog,
  countByCategory,
  DEFAULT_FILTERS,
  filterProducts,
  isSoldAt,
  sortProducts,
} from './catalog';

const groups: EquivalenceGroup[] = [
  { id: 'lait', label: 'Lait demi-écrémé', categoryId: 'cremerie', refUnit: 'L' },
  { id: 'pates', label: 'Spaghetti', categoryId: 'epicerie-salee', refUnit: 'kg' },
];

function make(partial: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    name: 'Lait demi-écrémé UHT',
    brand: 'Lactel',
    brandType: 'nationale',
    enseignes: [],
    categoryId: 'cremerie',
    icon: '🥛',
    ean: '',
    pack: { count: 1, size: 1000, unit: 'ml' },
    soldByWeight: false,
    equivalenceGroup: 'lait',
    flags: { bio: false, halal: false },
    ...partial,
  };
}

const products = [
  make({ id: 'lactel' }),
  make({ id: 'milbona', brand: 'Milbona', brandType: 'distributeur', enseignes: ['lidl'] }),
  make({
    id: 'milbona-6',
    brand: 'Milbona',
    brandType: 'distributeur',
    enseignes: ['lidl'],
    pack: { count: 6, size: 1000, unit: 'ml' },
  }),
  make({
    id: 'bio',
    brand: 'Carrefour Bio',
    brandType: 'distributeur',
    enseignes: ['carrefour'],
    flags: { bio: true, halal: false },
  }),
  make({
    id: 'spaghetti',
    name: 'Spaghetti',
    brand: 'Barilla',
    categoryId: 'epicerie-salee',
    equivalenceGroup: 'pates',
    pack: { count: 1, size: 500, unit: 'g' },
  }),
];
const catalog = buildCatalog([], [], { products, groups });
const ids = (list: Product[]) => list.map((p) => p.id);

describe('filtres du catalogue', () => {
  it('recherche sans tenir compte des accents ni de la casse, y compris dans le nom du groupe', () => {
    expect(ids(filterProducts(catalog, { ...DEFAULT_FILTERS, query: 'ECREME milbona' }))).toEqual([
      'milbona',
      'milbona-6',
    ]);
    expect(ids(filterProducts(catalog, { ...DEFAULT_FILTERS, query: 'spaghéttis' }))).toEqual([]);
    expect(ids(filterProducts(catalog, { ...DEFAULT_FILTERS, query: 'spaghetti' }))).toEqual([
      'spaghetti',
    ]);
  });

  it('filtre par enseigne : marques nationales partout, marques de distributeur chez elles seulement', () => {
    expect(ids(filterProducts(catalog, { ...DEFAULT_FILTERS, enseigne: 'lidl' }))).toEqual([
      'lactel',
      'milbona',
      'milbona-6',
      'spaghetti',
    ]);
    expect(isSoldAt(products[1]!, 'carrefour')).toBe(false);
  });

  it('combine catégorie, bio et marque de distributeur', () => {
    const f = { ...DEFAULT_FILTERS, categoryId: 'cremerie' as const };
    expect(ids(filterProducts(catalog, { ...f, bioOnly: true }))).toEqual(['bio']);
    expect(ids(filterProducts(catalog, { ...f, distributeurOnly: true }))).toEqual([
      'milbona',
      'milbona-6',
      'bio',
    ]);
  });

  it('peut ignorer la catégorie (pour compter les résultats par rayon)', () => {
    const f = { ...DEFAULT_FILTERS, categoryId: 'cremerie' as const, query: 'barilla' };
    expect(ids(filterProducts(catalog, f, undefined, { ignoreCategory: true }))).toEqual([
      'spaghetti',
    ]);
    expect(countByCategory(products).get('cremerie')).toBe(4);
  });

  it('« prix connu uniquement » garde les produits qui ont un prix', () => {
    const prices = { priceOf: (p: Product) => (p.id === 'lactel' ? 120 : null) };
    expect(
      ids(filterProducts(catalog, { ...DEFAULT_FILTERS, knownPriceOnly: true }, prices)),
    ).toEqual(['lactel']);
  });
});

describe('tri du catalogue', () => {
  const prices = {
    priceOf: (p: Product) =>
      ({ lactel: 125, milbona: 95, 'milbona-6': 540, spaghetti: 99 })[p.id] ?? null,
  };

  it('trie par nom, puis par marque et par format', () => {
    expect(ids(sortProducts(products, 'nom'))).toEqual([
      'bio',
      'lactel',
      'milbona',
      'milbona-6',
      'spaghetti',
    ]);
  });

  it('trie par prix, les prix inconnus en dernier', () => {
    expect(ids(sortProducts(products, 'prix', prices))).toEqual([
      'milbona',
      'spaghetti',
      'lactel',
      'milbona-6',
      'bio',
    ]);
  });

  it('trie par prix au litre ou au kilo pour comparer des formats différents', () => {
    // 5,40 € les 6 L = 0,90 €/L, moins cher que 0,95 €/L ; 0,99 € les 500 g = 1,98 €/kg.
    expect(ids(sortProducts(products, 'prix-unitaire', prices))).toEqual([
      'milbona-6',
      'milbona',
      'lactel',
      'spaghetti',
      'bio',
    ]);
  });

  it('ne modifie pas le tableau d’origine', () => {
    const copy = [...products];
    sortProducts(products, 'prix', prices);
    expect(products).toEqual(copy);
  });
});

describe('catalogue et produits personnalisés', () => {
  it('ajoute les produits personnalisés sans jamais écraser un produit de base', () => {
    const custom = make({ id: 'perso-1', name: 'Mon produit', custom: true });
    const clash = make({ id: 'lactel', name: 'Écrasé ?', custom: true });
    const merged = buildCatalog([custom, clash], [], { products, groups });
    expect(merged.products).toHaveLength(products.length + 1);
    expect(merged.productById.get('lactel')?.name).toBe('Lait demi-écrémé UHT');
  });
});
