import baseProducts from '../data/products.json';
import type { CategoryId, EnseigneId, Product, StoreReference } from '../types/catalog';
import { matchesQuery, normalizeText } from '../utils/text';
import { refQuantity } from '../utils/units';

export const BASE_PRODUCTS = baseProducts as Product[];

export interface Catalog {
  products: Product[];
  productById: Map<string, Product>;
}

/** Assemble le catalogue de base et les ajouts de l'utilisateur. Un ajout ne remplace jamais une fiche de base. */
export function buildCatalog(
  customProducts: Product[] = [],
  base: Product[] = BASE_PRODUCTS,
): Catalog {
  const productById = new Map(base.map((p) => [p.id, p]));
  for (const product of customProducts) {
    if (!productById.has(product.id)) productById.set(product.id, product);
  }
  return { products: [...productById.values()], productById };
}

/** Référence à prendre en rayon dans une enseigne, si elle est connue. */
export function referenceAt(product: Product, enseigne: EnseigneId): StoreReference | undefined {
  return product.references.find((r) => r.enseigne === enseigne);
}

const haystacks = new WeakMap<Product, string>();

/** Texte de recherche : nom de la fiche et marques connues (« milbona » retrouve le lait). */
function haystackOf(product: Product): string {
  let value = haystacks.get(product);
  if (value === undefined) {
    value = normalizeText(
      [product.name, product.brand ?? '', ...product.references.map((r) => r.brand)].join(' '),
    );
    haystacks.set(product, value);
  }
  return value;
}

export interface CatalogFilters {
  query: string;
  categoryId: CategoryId | 'all';
  knownPriceOnly: boolean;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  query: '',
  categoryId: 'all',
  knownPriceOnly: false,
};

export interface PriceLookup {
  /** Prix du conditionnement de la fiche en centimes, ou null s'il est inconnu. */
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
    if (filters.knownPriceOnly && prices.priceOf(product) === null) return false;
    if (query && !matchesQuery(haystackOf(product), query)) return false;
    return true;
  });
}

export type CatalogSort = 'nom' | 'prix' | 'prix-unitaire';

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

/** Trie sans modifier le tableau d'origine. Les fiches sans prix connu passent en dernier. */
export function sortProducts(
  products: Product[],
  sort: CatalogSort,
  prices: PriceLookup = NO_PRICES,
): Product[] {
  const byName = (a: Product, b: Product) =>
    collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
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
