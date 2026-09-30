import baseGroups from '../data/equivalenceGroups.json';
import baseProducts from '../data/products.json';
import type { CategoryId, EnseigneId, EquivalenceGroup, Product } from '../types/catalog';
import { normalizeText, matchesQuery } from '../utils/text';
import { refQuantity } from '../utils/units';

export const BASE_PRODUCTS = baseProducts as Product[];
export const BASE_GROUPS = baseGroups as EquivalenceGroup[];

export interface Catalog {
  products: Product[];
  groups: EquivalenceGroup[];
  productById: Map<string, Product>;
  groupById: Map<string, EquivalenceGroup>;
}

/** Assemble le catalogue de base et les ajouts de l'utilisateur. Les ajouts ne remplacent jamais un produit de base. */
export function buildCatalog(
  customProducts: Product[] = [],
  customGroups: EquivalenceGroup[] = [],
  base: { products: Product[]; groups: EquivalenceGroup[] } = {
    products: BASE_PRODUCTS,
    groups: BASE_GROUPS,
  },
): Catalog {
  const productById = new Map(base.products.map((p) => [p.id, p]));
  for (const product of customProducts)
    if (!productById.has(product.id)) productById.set(product.id, product);
  const groupById = new Map(base.groups.map((g) => [g.id, g]));
  for (const group of customGroups) if (!groupById.has(group.id)) groupById.set(group.id, group);
  return {
    products: [...productById.values()],
    groups: [...groupById.values()],
    productById,
    groupById,
  };
}

/** Un produit est vendu dans une enseigne s'il y est référencé, ou s'il est vendu partout. */
export function isSoldAt(product: Product, enseigne: EnseigneId): boolean {
  return product.enseignes.length === 0 || product.enseignes.includes(enseigne);
}

const haystacks = new WeakMap<Product, string>();

function haystackOf(product: Product, group?: EquivalenceGroup): string {
  let value = haystacks.get(product);
  if (value === undefined) {
    value = normalizeText([product.name, product.brand, group?.label ?? ''].join(' '));
    haystacks.set(product, value);
  }
  return value;
}

export interface CatalogFilters {
  query: string;
  categoryId: CategoryId | 'all';
  enseigne: EnseigneId | 'all';
  bioOnly: boolean;
  distributeurOnly: boolean;
  knownPriceOnly: boolean;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  query: '',
  categoryId: 'all',
  enseigne: 'all',
  bioOnly: false,
  distributeurOnly: false,
  knownPriceOnly: false,
};

export interface PriceLookup {
  /** Prix du conditionnement en centimes, ou null s'il est inconnu. */
  priceOf: (product: Product) => number | null;
}

export const NO_PRICES: PriceLookup = { priceOf: () => null };

export function filterProducts(
  catalog: Catalog,
  filters: CatalogFilters,
  prices: PriceLookup = NO_PRICES,
  options: { ignoreCategory?: boolean } = {},
): Product[] {
  const query = filters.query.trim();
  return catalog.products.filter((product) => {
    if (
      !options.ignoreCategory &&
      filters.categoryId !== 'all' &&
      product.categoryId !== filters.categoryId
    ) {
      return false;
    }
    if (filters.enseigne !== 'all' && !isSoldAt(product, filters.enseigne)) return false;
    if (filters.bioOnly && !product.flags.bio) return false;
    if (filters.distributeurOnly && product.brandType !== 'distributeur') return false;
    if (filters.knownPriceOnly && prices.priceOf(product) === null) return false;
    if (
      query &&
      !matchesQuery(haystackOf(product, catalog.groupById.get(product.equivalenceGroup)), query)
    ) {
      return false;
    }
    return true;
  });
}

export type CatalogSort = 'nom' | 'prix' | 'prix-unitaire';

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

/** Trie sans modifier le tableau d'origine. Les produits sans prix connu passent en dernier. */
export function sortProducts(
  products: Product[],
  sort: CatalogSort,
  prices: PriceLookup = NO_PRICES,
): Product[] {
  const byName = (a: Product, b: Product) =>
    collator.compare(a.name, b.name) ||
    collator.compare(a.brand, b.brand) ||
    refQuantity(a.pack) - refQuantity(b.pack);
  if (sort === 'nom') return [...products].sort(byName);
  const value = (p: Product): number | null => {
    const price = prices.priceOf(p);
    if (price === null) return null;
    return sort === 'prix' ? price : price / refQuantity(p.pack);
  };
  return [...products].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === null && vb === null) return byName(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    return va - vb || byName(a, b);
  });
}

export function countByCategory(products: Product[]): Map<CategoryId, number> {
  const counts = new Map<CategoryId, number>();
  for (const product of products)
    counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
  return counts;
}
