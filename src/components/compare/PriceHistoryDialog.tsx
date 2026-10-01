import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { getEnseigne } from '../../data/enseignes';
import { useSettings } from '../../hooks/useAppContexts';
import {
  getPriceHistory,
  openPricesProductUrl,
  type ParsedOpenPrice,
} from '../../services/openPrices';
import { storeLabel } from '../../services/stores';
import type { Pack, Product } from '../../types/catalog';
import { formatFrDate, toIsoDate } from '../../utils/dates';
import { formatCents, unitPriceCents } from '../../utils/money';
import { REF_UNIT_LABEL, refQuantity, refUnitOf } from '../../utils/units';
import { Dialog } from '../ui/Dialog';

const PriceHistoryChart = lazy(() => import('./PriceHistoryChart'));
const DAY_MS = 24 * 60 * 60 * 1000;

export interface HistoryPoint {
  date: string;
  series: string;
  /** Prix au kilo, au litre ou à la pièce, en centimes. */
  cents: number;
}

/** Évolution du prix d'une fiche sur un an, d'après Open Prices, en courbes et en tableau. */
export function PriceHistoryDialog({
  product,
  open,
  onClose,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
}) {
  const { stores } = useSettings();
  const located = stores.filter((s) => s.locationId !== undefined);
  const enseignes = new Set(stores.map((s) => s.enseigne));
  const packByCode = new Map<string, Pack>();
  for (const ref of product.references) {
    if (ref.ean && enseignes.has(ref.enseigne)) packByCode.set(ref.ean, ref.pack ?? product.pack);
  }
  if (product.ean) packByCode.set(product.ean, product.pack);
  const codes = [...packByCode.keys()];
  const tag = product.offCategoryTag;
  const locationIds = located.map((s) => s.locationId!);
  const canQuery = codes.length > 0 || (tag !== undefined && locationIds.length > 0);

  const query = useQuery({
    queryKey: ['historique', product.id, codes, tag ?? null, locationIds],
    queryFn: async ({ signal }) => {
      const since = toIsoDate(new Date(Date.now() - 365 * DAY_MS));
      const results: ParsedOpenPrice[] = [];
      for (const code of codes) results.push(...(await getPriceHistory({ code }, since, signal)));
      if (tag && locationIds.length > 0) {
        results.push(...(await getPriceHistory({ categoryTag: tag, locationIds }, since, signal)));
      }
      return results;
    },
    enabled: open && canQuery,
    staleTime: DAY_MS,
  });

  const storeByLocation = new Map(located.map((s) => [s.locationId, s]));
  const points: HistoryPoint[] = (query.data ?? [])
    .flatMap((p) => {
      const pack = packByCode.get(p.productCode ?? '') ?? product.pack;
      const cents = p.per === 'pack' ? unitPriceCents(p.cents, refQuantity(pack)) : p.cents;
      if (cents === null) return [];
      const store = p.locationId !== null ? storeByLocation.get(p.locationId) : undefined;
      const enseigne = p.location?.enseigne;
      const series = store
        ? storeLabel(store)
        : enseigne
          ? `Autres magasins ${getEnseigne(enseigne).label}`
          : 'Autres magasins';
      return [{ date: p.date, series, cents }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const unit = REF_UNIT_LABEL[refUnitOf(product.pack)];
  // Les graphiques ont besoin de ResizeObserver ; sans lui (tests), le tableau suffit.
  const canChart = typeof window !== 'undefined' && 'ResizeObserver' in window;

  return (
    <Dialog open={open} onClose={onClose} title={`Historique : ${product.name}`}>
      <div className="space-y-4">
        {!canQuery ? (
          <p>
            Ce produit n’a pas encore de code-barres dans le catalogue pour vos enseignes : son
            historique n’est pas disponible.
          </p>
        ) : query.isLoading ? (
          <p className="text-ink-soft">Chargement de l’historique…</p>
        ) : query.isError ? (
          <p className="font-medium text-dear">
            L’historique n’a pas pu être chargé. Réessayez plus tard.
          </p>
        ) : points.length === 0 ? (
          <p>Aucun relevé sur les 12 derniers mois.</p>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              Prix en euros par {unit}, relevés Open Prices des 12 derniers mois.
            </p>
            {canChart && (
              <Suspense fallback={<p className="text-ink-soft">Chargement du graphique…</p>}>
                <PriceHistoryChart points={points} unit={unit} />
              </Suspense>
            )}
            <details open={!canChart}>
              <summary className="cursor-pointer font-medium">
                Voir les relevés ({points.length})
              </summary>
              <div className="mt-2 max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Relevés de prix, du plus récent au plus ancien
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="py-1 text-left">
                        Date
                      </th>
                      <th scope="col" className="py-1 text-left">
                        Magasin
                      </th>
                      <th scope="col" className="py-1 text-right">
                        Prix / {unit}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...points].reverse().map((p, i) => (
                      <tr key={`${p.date}-${p.series}-${i}`} className="border-t border-line">
                        <td className="py-1">{formatFrDate(p.date)}</td>
                        <td className="py-1">{p.series}</td>
                        <td className="py-1 text-right tabular">{formatCents(p.cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
        {codes[0] && (
          <a
            href={openPricesProductUrl(codes[0])}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2"
          >
            Voir ce produit sur Open Prices
            <ExternalLink size={14} aria-hidden />
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        )}
      </div>
    </Dialog>
  );
}
