import { PackagePlus, Search, X } from 'lucide-react';
import { useId } from 'react';
import type { CatalogFilters, CatalogSort } from '../../services/catalog';

interface Props {
  filters: CatalogFilters;
  onChange: (patch: Partial<CatalogFilters>) => void;
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
  /** Faux tant qu'aucune source de prix n'est branchée : les tris et filtres par prix sont alors désactivés. */
  pricesAvailable: boolean;
  onAddProduct: () => void;
}

function Toggle({
  pressed,
  onClick,
  disabled,
  children,
  hint,
}: {
  pressed: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      title={hint}
      onClick={onClick}
      className={[
        'h-9 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap',
        pressed
          ? 'border-primary bg-primary text-on-primary'
          : 'border-line-strong bg-surface hover:bg-surface-2',
        'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:text-ink-soft',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function CatalogToolbar({
  filters,
  onChange,
  sort,
  onSortChange,
  pricesAvailable,
  onAddProduct,
}: Props) {
  const searchId = useId();
  const sortId = useId();
  const noPriceHint = 'Disponible dès que les prix Open Prices seront chargés';
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            Rechercher un produit
          </label>
          <Search
            size={18}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft"
          />
          <input
            id={searchId}
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="Lait, pâtes, lessive, Lactel…"
            autoComplete="off"
            enterKeyHint="search"
            className="h-12 w-full rounded-full border border-line-strong bg-surface pr-11 pl-10 text-base placeholder:text-ink-soft [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ query: '' })}
              aria-label="Effacer la recherche"
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full hover:bg-surface-2"
            >
              <X size={18} aria-hidden />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onAddProduct}
          className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 font-medium hover:bg-surface-2"
        >
          <PackagePlus size={18} aria-hidden />
          <span className="max-sm:sr-only">Ajouter un produit</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle pressed={filters.bioOnly} onClick={() => onChange({ bioOnly: !filters.bioOnly })}>
          Bio
        </Toggle>
        <Toggle
          pressed={filters.distributeurOnly}
          onClick={() => onChange({ distributeurOnly: !filters.distributeurOnly })}
        >
          Marques de distributeur
        </Toggle>
        <Toggle
          pressed={filters.knownPriceOnly}
          disabled={!pricesAvailable}
          hint={pricesAvailable ? undefined : noPriceHint}
          onClick={() => onChange({ knownPriceOnly: !filters.knownPriceOnly })}
        >
          Prix connu uniquement
        </Toggle>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor={sortId} className="text-sm text-ink-soft">
            Trier par
          </label>
          <select
            id={sortId}
            value={sort}
            onChange={(e) => onSortChange(e.target.value as CatalogSort)}
            className="h-9 rounded-full border border-line-strong bg-surface px-3 text-sm font-medium"
          >
            <option value="nom">Nom</option>
            <option value="prix" disabled={!pricesAvailable}>
              Prix
            </option>
            <option value="prix-unitaire" disabled={!pricesAvailable}>
              Prix au kilo ou au litre
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}
