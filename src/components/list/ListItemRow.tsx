import { ChevronDown, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import type { ListItem } from '../../types/list';
import type { Store } from '../../types/stores';
import { storeLabel } from '../../services/stores';
import { QuantityStepper } from '../ui/QuantityStepper';

export interface ItemDescription {
  title: string;
  detail: string;
  icon: string;
  quantity: string;
  /** Prix estimé de l'article dans son magasin, déjà formaté (étape des prix). */
  price?: string;
}

interface Props {
  item: ListItem;
  description: ItemDescription;
  stores: Store[];
  onToggle: () => void;
  onChangeQuantity: (steps: number) => void;
  onNote: (note: string) => void;
  onAssign: (storeId: string | undefined) => void;
  onRemove: () => void;
}

/** Une ligne de la liste : case à cocher en magasin, quantité, et un panneau pour la note et le magasin. */
export function ListItemRow({
  item,
  description: d,
  stores,
  onToggle,
  onChangeQuantity,
  onNote,
  onAssign,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNoteDraft] = useState(item.note ?? '');
  const checkboxId = useId();
  const panelId = useId();
  const noteId = useId();
  const storeId = useId();

  return (
    <li className={item.checked ? 'bg-surface-2' : ''}>
      <div className="flex items-start gap-2 px-3 py-2.5 sm:gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={item.checked}
          onChange={onToggle}
          className="mt-1 size-6 shrink-0 accent-[var(--primary)]"
        />
        <span aria-hidden className="mt-0.5 text-xl">
          {d.icon}
        </span>
        {/* Sur téléphone, le sélecteur de quantité passe sous le nom quand la place manque. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <label
              htmlFor={checkboxId}
              className={`font-medium ${item.checked ? 'text-ink-soft line-through' : ''}`}
            >
              {d.title}
            </label>
            <p className="text-sm text-ink-soft">
              {d.detail}
              {d.price && (
                <>
                  <span aria-hidden> · </span>
                  <span className="font-semibold text-ink tabular">{d.price}</span>
                </>
              )}
            </p>
            {item.note && <p className="text-sm italic">{item.note}</p>}
          </div>
          <div className="ml-auto">
            <QuantityStepper
              size="sm"
              label={d.title}
              display={d.quantity}
              isLast={item.quantity - item.step <= 0}
              onIncrement={() => onChangeQuantity(1)}
              onDecrement={() => onChangeQuantity(-1)}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`Note et magasin pour ${d.title}`}
          className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink"
        >
          <ChevronDown size={18} aria-hidden className={open ? 'rotate-180' : ''} />
        </button>
      </div>
      {open && (
        <div
          id={panelId}
          className="grid gap-3 border-t border-line px-3 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
        >
          <div className="space-y-1">
            <label htmlFor={noteId} className="block text-sm font-medium">
              Note
            </label>
            <input
              id={noteId}
              value={note}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => onNote(note)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onNote(note);
              }}
              placeholder="bien mûres, en promotion…"
              className="h-10 w-full rounded-md border border-line-strong bg-surface px-3"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={storeId} className="block text-sm font-medium">
              Magasin
            </label>
            <select
              id={storeId}
              value={item.assignedStoreId ?? ''}
              onChange={(e) => onAssign(e.target.value || undefined)}
              className="h-10 w-full rounded-md border border-line-strong bg-surface px-2"
            >
              <option value="">Aucun en particulier</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {storeLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-10 items-center justify-center gap-2 rounded-full px-3 font-medium text-dear hover:bg-dear-bg"
          >
            <Trash2 size={16} aria-hidden />
            Retirer de la liste
          </button>
        </div>
      )}
    </li>
  );
}
