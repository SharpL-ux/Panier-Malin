import { Clock } from 'lucide-react';
import { rowExtremes, type Comparison, type Line } from '../../services/comparator';
import { storeLabel } from '../../services/stores';
import type { Product } from '../../types/catalog';
import type { Store } from '../../types/stores';
import { formatCents } from '../../utils/money';
import { productQuantityLabel } from '../../utils/productLabels';

interface Props {
  lines: Line[];
  stores: Store[];
  comparison: Comparison;
  onHistory: (product: Product) => void;
  onEnterPrice: (product: Product, storeId: string) => void;
}

/**
 * Tableau article × magasin. Le prix le plus bas de chaque ligne est en vert, le plus haut
 * en rouge ; un texte pour les lecteurs d'écran double toujours la couleur.
 */
export function CompareTable({ lines, stores, comparison, onHistory, onEnterPrice }: Props) {
  const compared = new Set(comparison.comparedRows);
  const totals = new Map(comparison.totals.map((t) => [t.storeId, t]));
  return (
    <section aria-labelledby="tableau-titre" className="space-y-2">
      <h2 id="tableau-titre" className="font-display text-xl font-bold">
        Article par article
      </h2>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <caption className="sr-only">
            Prix de chaque article de la liste dans chacun de vos magasins
          </caption>
          <thead>
            <tr className="border-b border-line-strong">
              <th scope="col" className="px-3 py-2 text-left">
                Article
              </th>
              {stores.map((s) => (
                <th key={s.id} scope="col" className="px-3 py-2 text-right">
                  {storeLabel(s)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, r) => {
              const row = comparison.matrix[r] ?? [];
              const extremes = rowExtremes(row);
              const name = line.product.name;
              return (
                <tr
                  key={line.item.id}
                  className={`border-b border-line ${compared.has(r) ? '' : 'text-ink-soft'}`}
                >
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <button
                      type="button"
                      onClick={() => onHistory(line.product)}
                      aria-label={`Historique des prix de ${name}`}
                      className="text-left font-medium underline decoration-line-strong underline-offset-2"
                    >
                      {name}
                    </button>
                    <span className="block text-xs text-ink-soft">
                      {productQuantityLabel(line.product, line.item.quantity)}
                      {compared.has(r) ? '' : ', non compté'}
                    </span>
                  </th>
                  {stores.map((s, c) => {
                    const cell = row[c] ?? null;
                    if (!cell) {
                      return (
                        <td key={s.id} className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => onEnterPrice(line.product, s.id)}
                            aria-label={`Saisir le prix de ${name} chez ${storeLabel(s)}`}
                            className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-xs text-ink-soft hover:text-ink"
                          >
                            Saisir
                          </button>
                        </td>
                      );
                    }
                    const cheap = extremes !== null && cell.cents === extremes.min;
                    const dear = extremes !== null && cell.cents === extremes.max;
                    const notes = [
                      cheap && 'le moins cher',
                      dear && 'le plus cher',
                      cell.selected.fallback &&
                        `relevé chez ${cell.selected.observation.fallbackFrom}`,
                      cell.selected.stale && 'relevé de plus de 3 mois',
                    ]
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <td
                        key={s.id}
                        className={`px-3 py-2 text-right tabular ${cheap ? 'bg-cheap-bg font-semibold text-cheap' : dear ? 'bg-dear-bg text-dear' : ''}`}
                      >
                        {cell.selected.fallback && (
                          <span aria-hidden title="Relevé dans un autre magasin de l’enseigne">
                            ≈{' '}
                          </span>
                        )}
                        {formatCents(cell.cents)}
                        {cell.selected.stale && (
                          <Clock size={12} aria-hidden className="ml-1 inline" />
                        )}
                        {notes && <span className="sr-only">, {notes}</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="px-3 py-2 text-left">
                {comparison.mode === 'communs'
                  ? 'Total des articles communs'
                  : 'Total des prix connus'}
              </th>
              {stores.map((s) => (
                <td key={s.id} className="px-3 py-2 text-right font-semibold tabular">
                  {formatCents(totals.get(s.id)?.totalCents ?? 0)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-ink-soft">
        En vert le prix le plus bas de la ligne, en rouge le plus haut. ≈ : prix relevé dans un
        autre magasin de la même enseigne. Horloge : relevé de plus de 3 mois. Touchez un article
        pour voir l’évolution de son prix.
      </p>
    </section>
  );
}
