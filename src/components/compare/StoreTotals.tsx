import type { Comparison } from '../../services/comparator';
import { storeLabel } from '../../services/stores';
import type { Store } from '../../types/stores';
import { formatCents } from '../../utils/money';
import { EnseigneBadge } from '../ui/EnseigneBadge';

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

/** Une carte par magasin : total, couverture, écart au moins cher, et une barre proportionnelle. */
export function StoreTotals({ comparison, stores }: { comparison: Comparison; stores: Store[] }) {
  const byId = new Map(stores.map((s) => [s.id, s]));
  const max = Math.max(1, ...comparison.totals.map((t) => t.totalCents));
  const cheapest = comparison.totals.find((t) => t.storeId === comparison.cheapestStoreId);
  const ranked = comparison.mostExpensiveStoreId !== null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Total par magasin">
      {comparison.totals.map((t) => {
        const store = byId.get(t.storeId);
        if (!store) return null;
        const isCheapest = ranked && t.storeId === comparison.cheapestStoreId;
        const isDearest = ranked && t.storeId === comparison.mostExpensiveStoreId;
        const comparable = comparison.comparableIds.includes(t.storeId);
        const diff = cheapest && comparable ? t.totalCents - cheapest.totalCents : 0;
        return (
          <li
            key={t.storeId}
            className={`rounded-md border p-4 ${isCheapest ? 'border-cheap bg-cheap-bg' : 'border-line bg-surface'}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {store.enseigne && <EnseigneBadge id={store.enseigne} />}
              <h3 className="font-semibold">{storeLabel(store)}</h3>
            </div>
            {isCheapest && <p className="mt-1 text-sm font-semibold text-cheap">Le moins cher</p>}
            {isDearest && <p className="mt-1 text-sm font-semibold text-dear">Le plus cher</p>}
            <p className="mt-2 font-display text-3xl font-bold tabular">
              {formatCents(t.totalCents)}
            </p>
            <p className="text-sm text-ink-soft tabular">
              {t.pricedCount}/{comparison.itemCount} articles avec prix
            </p>
            {diff > 0 && (
              <p className="text-sm tabular">{formatCents(diff)} de plus que le moins cher</p>
            )}
            {!comparable && t.pricedCount > 0 && (
              <p className="text-sm">Moins d’articles connus : total non comparable</p>
            )}
            {t.fallbackCount > 0 && (
              <p className="text-xs">
                ≈ {t.fallbackCount} {plural(t.fallbackCount, 'prix relevé', 'prix relevés')} dans un
                autre magasin de l’enseigne
              </p>
            )}
            {t.staleCount > 0 && (
              <p className="text-xs">
                {t.staleCount} {plural(t.staleCount, 'relevé', 'relevés')} de plus de 3 mois
              </p>
            )}
            <div aria-hidden className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full ${isCheapest ? 'bg-cheap' : isDearest ? 'bg-dear' : 'bg-ink-soft'}`}
                style={{ width: `${Math.round((t.totalCents / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
