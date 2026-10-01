import { FileDown, Printer } from 'lucide-react';
import { useState } from 'react';
import { usePrices, useSettings, useShoppingList } from '../../hooks/useAppContexts';
import { useComparison } from '../../hooks/useComparison';
import { usePersistentState } from '../../hooks/usePersistentState';
import type { Line } from '../../services/comparator';
import {
  buildComparisonSheet,
  buildStoreSheet,
  DEFAULT_PDF_OPTIONS,
  type PdfOptions,
} from '../../services/pdfModel';
import { storeLabel } from '../../services/stores';
import type { Store } from '../../types/stores';
import { Dialog } from '../ui/Dialog';

interface SheetChoice {
  key: string;
  label: string;
  store: Store | null;
  lines: Line[];
}

const OPTIONS: { key: keyof PdfOptions; label: string }[] = [
  { key: 'showPrices', label: 'Afficher les prix' },
  { key: 'showDetails', label: 'Marque à prendre et format' },
  { key: 'showNotes', label: 'Notes' },
];

/** Export : un PDF par magasin (A4, noir et blanc), le tableau comparatif en paysage, ou l'impression. */
export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { list } = useShoppingList();
  const { stores } = useSettings();
  const { priceAt } = usePrices();
  const { lines, comparison } = useComparison();
  const [options, setOptions] = usePersistentState<PdfOptions>('reglages:pdf', () => ({
    ...DEFAULT_PDF_OPTIONS,
  }));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const known = new Set(stores.map((s) => s.id));
  const unassigned = lines.filter(
    (l) => !l.item.assignedStoreId || !known.has(l.item.assignedStoreId),
  );
  const assigned = unassigned.length < lines.length;
  const sheets: SheetChoice[] = assigned
    ? [
        ...stores
          .map((s) => ({
            key: s.id,
            label: storeLabel(s),
            store: s,
            lines: lines.filter((l) => l.item.assignedStoreId === s.id),
          }))
          .filter((c) => c.lines.length > 0),
        ...(unassigned.length
          ? [
              {
                key: 'sans-magasin',
                label: 'Articles sans magasin',
                store: null,
                lines: unassigned,
              },
            ]
          : []),
      ]
    : stores.length > 0
      ? stores.map((s) => ({ key: s.id, label: storeLabel(s), store: s, lines }))
      : [{ key: 'liste', label: 'Liste complète', store: null, lines }];

  async function run(key: string, task: () => Promise<void>) {
    setBusy(key);
    setError(undefined);
    try {
      await task();
    } catch {
      setError('Le PDF n’a pas pu être créé. Réessayez.');
    } finally {
      setBusy(null);
    }
  }
  const today = new Date();
  const downloadSheet = (choice: SheetChoice) =>
    run(choice.key, async () => {
      const { downloadStoreSheet } = await import('../pdf/pdfExport');
      await downloadStoreSheet(
        buildStoreSheet({
          listName: list.name,
          weekOf: list.weekOf,
          store: choice.store,
          lines: choice.lines,
          priceAt,
          options,
          today,
        }),
      );
    });
  const downloadComparison = () =>
    run('comparatif', async () => {
      const { downloadComparisonSheet } = await import('../pdf/pdfExport');
      await downloadComparisonSheet(
        buildComparisonSheet({
          listName: list.name,
          weekOf: list.weekOf,
          lines,
          stores,
          comparison,
          today,
        }),
      );
    });
  const button =
    'flex h-11 w-full items-center gap-2 rounded-md border border-line-strong px-3 text-left font-medium hover:bg-surface-2 disabled:opacity-60';

  return (
    <Dialog open={open} onClose={onClose} title="Exporter la liste">
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="mb-1 font-medium">Contenu</legend>
          {OPTIONS.map((o) => (
            <label key={o.key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options[o.key]}
                onChange={(e) =>
                  setOptions((current) => ({ ...current, [o.key]: e.target.checked }))
                }
                className="size-5 accent-[var(--primary)]"
              />
              {o.label}
            </label>
          ))}
        </fieldset>
        <div className="space-y-2">
          <h3 className="font-medium">Un PDF par magasin (A4, noir et blanc)</h3>
          <ul className="space-y-2">
            {sheets.map((choice) => (
              <li key={choice.key}>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void downloadSheet(choice)}
                  className={button}
                >
                  <FileDown size={18} aria-hidden />
                  <span className="flex-1">{choice.label}</span>
                  <span className="text-sm font-normal text-ink-soft">
                    {busy === choice.key
                      ? 'Création…'
                      : `${choice.lines.length} ${choice.lines.length > 1 ? 'articles' : 'article'}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {stores.length > 1 && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void downloadComparison()}
            className={button}
          >
            <FileDown size={18} aria-hidden />
            <span className="flex-1">Tableau comparatif (A4 paysage)</span>
            {busy === 'comparatif' && (
              <span className="text-sm font-normal text-ink-soft">Création…</span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onClose();
            window.setTimeout(() => window.print(), 50);
          }}
          className={button}
        >
          <Printer size={18} aria-hidden />
          <span className="flex-1">Imprimer la liste</span>
        </button>
        {error && (
          <p role="alert" className="font-medium text-dear">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
