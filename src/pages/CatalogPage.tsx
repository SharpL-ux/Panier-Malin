import { useDeferredValue, useMemo, useState } from 'react';
import { CatalogToolbar } from '../components/catalog/CatalogToolbar';
import { CategoryNav } from '../components/catalog/CategoryNav';
import { CustomProductDialog } from '../components/catalog/CustomProductDialog';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { getCategory } from '../data/categories';
import { getEnseigne } from '../data/enseignes';
import { useCatalog, useSettings } from '../hooks/useAppContexts';
import {
  countByCategory,
  DEFAULT_FILTERS,
  filterProducts,
  sortProducts,
  type CatalogFilters,
  type CatalogSort,
} from '../services/catalog';

export function CatalogPage() {
  const { catalog } = useCatalog();
  const { enseigne } = useSettings();
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<CatalogSort>('nom');
  const [dialog, setDialog] = useState<{ open: boolean; name?: string }>({ open: false });

  const query = useDeferredValue(filters.query);
  const effective = useMemo(() => ({ ...filters, query, enseigne }), [filters, query, enseigne]);

  const acrossCategories = useMemo(
    () => filterProducts(catalog, effective, undefined, { ignoreCategory: true }),
    [catalog, effective],
  );
  const counts = useMemo(() => countByCategory(acrossCategories), [acrossCategories]);
  const results = useMemo(() => {
    const inCategory =
      effective.categoryId === 'all'
        ? acrossCategories
        : acrossCategories.filter((p) => p.categoryId === effective.categoryId);
    return sortProducts(inCategory, sort);
  }, [acrossCategories, effective.categoryId, sort]);

  const heading =
    filters.categoryId === 'all' ? 'Tous les rayons' : getCategory(filters.categoryId).label;
  const where = enseigne === 'all' ? '' : ` chez ${getEnseigne(enseigne).label}`;
  const gridKey = JSON.stringify([effective, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-28 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8 lg:pb-12">
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        <h2 className="mb-2 hidden font-display text-xl font-bold lg:block">Rayons</h2>
        <div className="max-lg:sticky max-lg:top-16 max-lg:z-20 max-lg:-mx-4 max-lg:border-b max-lg:border-line max-lg:bg-paper max-lg:px-4 max-lg:py-2">
          <CategoryNav
            selected={filters.categoryId}
            counts={counts}
            total={acrossCategories.length}
            onSelect={(categoryId) => setFilters((f) => ({ ...f, categoryId }))}
          />
        </div>
      </aside>

      <section aria-labelledby="catalogue-titre" className="mt-3 space-y-4 lg:mt-0">
        <div className="flex items-baseline justify-between gap-4">
          <h1 id="catalogue-titre" className="font-display text-3xl leading-tight font-bold">
            {heading}
          </h1>
          <p className="shrink-0 text-sm text-ink-soft tabular" aria-live="polite">
            {results.length} {results.length > 1 ? 'produits' : 'produit'}
            {where}
          </p>
        </div>

        <CatalogToolbar
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          sort={sort}
          onSortChange={setSort}
          pricesAvailable={false}
          onAddProduct={() => setDialog({ open: true })}
        />

        {results.length > 0 ? (
          <ProductGrid key={gridKey} products={results} />
        ) : (
          <div className="rounded-md border border-dashed border-line-strong bg-surface p-6 text-center">
            <p className="font-medium">
              {filters.query
                ? `Aucun produit ne correspond à « ${filters.query} »${where}.`
                : `Aucun produit dans ce rayon${where}.`}
            </p>
            <p className="mt-1 text-ink-soft">
              Essayez un autre mot, retirez un filtre, ou créez le produit vous-même.
            </p>
            <button
              type="button"
              onClick={() => setDialog({ open: true, name: filters.query })}
              className="mt-4 h-11 rounded-full bg-primary px-5 font-medium text-on-primary"
            >
              {filters.query ? `Créer « ${filters.query} »` : 'Créer un produit'}
            </button>
          </div>
        )}
      </section>

      <CustomProductDialog
        open={dialog.open}
        initialName={dialog.name}
        initialCategory={filters.categoryId === 'all' ? undefined : filters.categoryId}
        onClose={() => setDialog({ open: false })}
      />
    </div>
  );
}
