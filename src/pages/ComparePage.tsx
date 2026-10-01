import { useState } from 'react';
import { Link } from 'react-router';
import { CompareTable } from '../components/compare/CompareTable';
import { OptimalBasketPanel } from '../components/compare/OptimalBasketPanel';
import { PriceHistoryDialog } from '../components/compare/PriceHistoryDialog';
import { PricesStatusBar } from '../components/compare/PricesStatusBar';
import { StoreTotals } from '../components/compare/StoreTotals';
import { PriceDialog } from '../components/prices/PriceDialog';
import { useSettings, useShoppingList } from '../hooks/useAppContexts';
import { useComparison } from '../hooks/useComparison';
import type { Comparison } from '../services/comparator';
import { storeLabel } from '../services/stores';
import type { Product } from '../types/catalog';
import type { ComparisonMode, Store } from '../types/stores';
import { formatCents } from '../utils/money';

const MODES: { id: ComparisonMode; label: string; help: string }[] = [
  {
    id: 'communs',
    label: 'Articles communs',
    help: 'Seuls les articles dont le prix est connu dans tous vos magasins sont comptés : les totaux sont directement comparables.',
  },
  {
    id: 'complet',
    label: 'Estimation complète',
    help: 'Tous les prix connus sont comptés. Le nombre d’articles avec prix indique ce que couvre chaque total.',
  },
];

function EmptyState({ text, to, label }: { text: string; to: string; label: string }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-surface p-6 text-center">
      <p>{text}</p>
      <Link
        to={to}
        className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-5 font-medium text-on-primary"
      >
        {label}
      </Link>
    </div>
  );
}

/** Phrase de synthèse : qui est le moins cher, et de combien. */
function summarize(comparison: Comparison, stores: Store[]): string {
  const label = (id: string | null) => {
    const store = stores.find((s) => s.id === id);
    return store ? storeLabel(store) : '';
  };
  const anyPrice = comparison.totals.some((t) => t.pricedCount > 0);
  if (comparison.mode === 'communs' && comparison.comparedRows.length === 0) {
    return 'Aucun article n’a de prix dans tous vos magasins. Passez en estimation complète, ou saisissez les prix manquants.';
  }
  if (!anyPrice)
    return 'Aucun prix connu pour cette liste dans vos magasins. Saisissez vos prix depuis le tableau.';
  if (stores.length === 1) return 'Ajoutez un deuxième magasin pour comparer.';
  if (comparison.mostExpensiveStoreId === null) {
    return `${label(comparison.cheapestStoreId)} est le seul magasin à connaître autant de prix : complétez les autres pour comparer.`;
  }
  if (comparison.savingsCents === 0)
    return 'Vos magasins affichent le même total sur ces articles.';
  return `En allant chez ${label(comparison.cheapestStoreId)} plutôt que chez ${label(comparison.mostExpensiveStoreId)}, vous économisez ${formatCents(comparison.savingsCents)} (${comparison.savingsPercent} %).`;
}

export function ComparePage() {
  const { stores, options, setOptions } = useSettings();
  const { list } = useShoppingList();
  const { lines, comparison } = useComparison();
  const [history, setHistory] = useState<Product | null>(null);
  const [entry, setEntry] = useState<{ product: Product; storeId: string } | null>(null);
  const noCommon = comparison.mode === 'communs' && comparison.comparedRows.length === 0;
  const anyPrice = comparison.totals.some((t) => t.pricedCount > 0);
  const hasPrices = comparison.matrix.some((row) => row.some(Boolean));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pt-6 pb-28 lg:pb-12">
      <div>
        <h1 className="font-display text-3xl font-bold">Comparer</h1>
        <p className="mt-1 text-ink-soft">
          {list.name}, {lines.length} {lines.length > 1 ? 'articles' : 'article'}
        </p>
      </div>
      {stores.length === 0 ? (
        <EmptyState
          text="Choisissez d’abord les magasins à comparer."
          to="/magasins"
          label="Choisir mes magasins"
        />
      ) : lines.length === 0 ? (
        <EmptyState
          text="Votre liste est vide : ajoutez des produits pour comparer leurs prix."
          to="/"
          label="Ouvrir le catalogue"
        />
      ) : (
        <>
          <PricesStatusBar />
          <fieldset>
            <legend className="mb-2 font-medium">Mode de comparaison</legend>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <label
                  key={m.id}
                  className="flex h-10 cursor-pointer items-center rounded-full border border-line-strong px-4 font-medium has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
                >
                  <input
                    type="radio"
                    name="mode-comparaison"
                    value={m.id}
                    checked={options.mode === m.id}
                    onChange={() => setOptions({ mode: m.id })}
                    className="sr-only"
                  />
                  {m.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {MODES.find((m) => m.id === options.mode)?.help}
            </p>
          </fieldset>
          <p className="text-lg" aria-live="polite">
            {summarize(comparison, stores)}
          </p>
          {!noCommon && anyPrice && <StoreTotals comparison={comparison} stores={stores} />}
          {hasPrices && <OptimalBasketPanel lines={lines} />}
          <CompareTable
            lines={lines}
            stores={stores}
            comparison={comparison}
            onHistory={setHistory}
            onEnterPrice={(product, storeId) => setEntry({ product, storeId })}
          />
        </>
      )}
      {history && <PriceHistoryDialog product={history} open onClose={() => setHistory(null)} />}
      {entry && (
        <PriceDialog
          product={entry.product}
          storeId={entry.storeId}
          open
          onClose={() => setEntry(null)}
        />
      )}
    </div>
  );
}
