import { useState } from 'react';
import { useShoppingList } from '../../hooks/useAppContexts';
import { formatFrDate } from '../../utils/dates';
import { Dialog } from '../ui/Dialog';

/** Historique des listes : rouvrir une ancienne liste, la reprendre pour cette semaine, ou la supprimer. */
export function HistoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { list: current, lists, selectList, startNewList, deleteList } = useShoppingList();
  const [confirming, setConfirming] = useState<string | null>(null);
  const button =
    'h-9 rounded-full border border-line-strong px-3 text-sm font-medium hover:bg-surface-2';

  return (
    <Dialog open={open} onClose={onClose} title="Mes listes">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            startNewList();
            onClose();
          }}
          className="h-11 rounded-full bg-primary px-5 font-medium text-on-primary"
        >
          Nouvelle liste vide
        </button>
        <ul className="divide-y divide-line rounded-md border border-line">
          {lists.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {l.name}
                  {l.id === current.id && (
                    <span className="ml-2 text-sm font-normal text-ink-soft">(ouverte)</span>
                  )}
                </p>
                <p className="text-sm text-ink-soft tabular">
                  {l.items.length} {l.items.length > 1 ? 'articles' : 'article'}, semaine du{' '}
                  {formatFrDate(l.weekOf)}
                </p>
              </div>
              {l.id !== current.id && (
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    selectList(l.id);
                    onClose();
                  }}
                >
                  Ouvrir
                </button>
              )}
              <button
                type="button"
                className={button}
                disabled={l.items.length === 0}
                onClick={() => {
                  startNewList(l.id);
                  onClose();
                }}
                aria-label={`Reprendre ${l.name} pour cette semaine`}
              >
                Reprendre
              </button>
              <button
                type="button"
                className={`${button} text-dear`}
                onClick={() => {
                  if (confirming === l.id) {
                    deleteList(l.id);
                    setConfirming(null);
                  } else setConfirming(l.id);
                }}
                aria-label={
                  confirming === l.id
                    ? `Confirmer la suppression de ${l.name}`
                    : `Supprimer ${l.name}`
                }
              >
                {confirming === l.id ? 'Confirmer' : 'Supprimer'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
