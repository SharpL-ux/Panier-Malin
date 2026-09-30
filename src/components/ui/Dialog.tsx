import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Fenêtre modale basée sur <dialog> : le navigateur gère le piège du focus, la touche
 * Échap et le retour du focus à l'élément d'origine.
 */
export function Dialog({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto max-h-[92dvh] w-[min(40rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3">
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full hover:bg-surface-2"
          aria-label="Fermer"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
      {open && <div className="px-5 py-4">{children}</div>}
    </dialog>
  );
}
