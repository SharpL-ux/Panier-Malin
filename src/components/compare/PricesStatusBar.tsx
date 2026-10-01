import { RefreshCw } from 'lucide-react';
import { usePrices } from '../../hooks/useAppContexts';
import { formatFrDate, toIsoDate } from '../../utils/dates';

function when(ms: number): string {
  const date = new Date(ms);
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `le ${formatFrDate(toIsoDate(date))} à ${time}`;
}

/** État des prix Open Prices, avec un bouton pour les recharger avant la fin des 24 h de cache. */
export function PricesStatusBar() {
  const { status, error, updatedAt, refresh } = usePrices();
  if (status === 'sans-magasin') return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm"
    >
      <p className="min-w-0 flex-1">
        {status === 'chargement' && 'Chargement des prix Open Prices…'}
        {status === 'erreur' && (
          <span className="font-medium text-dear">
            {error ?? 'Les prix Open Prices n’ont pas pu être chargés.'} Vos prix saisis restent
            utilisés.
          </span>
        )}
        {status === 'pret' &&
          (updatedAt
            ? `Prix Open Prices mis à jour ${when(updatedAt)}, gardés 24 h.`
            : 'Prix issus de vos saisies.')}
      </p>
      <button
        type="button"
        onClick={refresh}
        disabled={status === 'chargement'}
        className="flex h-9 items-center gap-2 rounded-full border border-line-strong px-3 font-medium hover:bg-surface-2 disabled:opacity-60"
      >
        <RefreshCw size={14} aria-hidden />
        Actualiser les prix
      </button>
    </div>
  );
}
