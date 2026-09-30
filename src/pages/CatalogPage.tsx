import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { CatalogToolbar } from '../components/catalog/CatalogToolbar';
import { CategoryNav } from '../components/catalog/CategoryNav';
import { CustomProductDialog } from '../components/catalog/CustomProductDialog';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { getCategory } from '../data/categories';
import { useCatalog } from '../hooks/useAppContexts';
import type { CategoryId } from '../types/catalog';
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
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<CatalogSort>('nom');
  const [dialog, setDialog] = useState<{ open: boolean; name?: string }>({ open: false });
  const titleRef = useRef<HTMLHeadingElement>(null);

  const query = useDeferredValue(filters.query);
  const effective = useMemo(() => ({ ...filters, query }), [filters, query]);

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
  const gridKey = JSON.stringify([effective, sort]);

  function selectCategory(categoryId: CategoryId | 'all') {
    setFilters((f) => ({ ...f, categoryId }));
    // Après un défilement, on revient en haut des résultats du nouveau rayon.
    const title = titleRef.current;
    if (title && title.getBoundingClientRect().top < 140)
      title.scrollIntoView?.({ block: 'start' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 lg:grid lg:grid-cols-[17rem_1fr] lg:gap-8 lg:pt-6 lg:pb-12">
      <aside className="max-lg:sticky max-lg:top-[calc(4rem_+_env(safe-area-inset-top))] max-lg:z-20 max-lg:-mx-4 max-lg:border-b max-lg:border-line max-lg:bg-paper max-lg:px-4 max-lg:py-2 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        <h2 className="mb-2 hidden font-display text-xl font-bold lg:block">Rayons</h2>
        <CategoryNav
          selected={filters.categoryId}
          counts={counts}
          total={acrossCategories.length}
          onSelect={selectCategory}
        />
      </aside>

      <section aria-labelledby="catalogue-titre" className="mt-3 space-y-4 lg:mt-0">
        <div className="flex items-baseline justify-between gap-4">
          <h1
            ref={titleRef}
            id="catalogue-titre"
            className="scroll-mt-36 font-display text-2xl leading-tight font-bold lg:scroll-mt-24 lg:text-3xl"
          >
            {heading}
          </h1>
          <p className="shrink-0 text-sm text-ink-soft tabular" aria-live="polite">
            {results.length} {results.length > 1 ? 'produits' : 'produit'}
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
                ? `Aucun produit ne correspond à « ${filters.query} ».`
                : 'Aucun produit dans ce rayon.'}
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
