import type { ReactNode } from 'react';

interface Props {
  itemCount: number;
  checkedCount: number;
  /** Total estimé et magasin le moins cher, fournis par le comparateur quand des prix existent. */
  children?: ReactNode;
}

/** Bandeau récapitulatif collé en bas de l'écran, au-dessus de la barre d'onglets sur mobile. */
export function ListSummaryBar({ itemCount, checkedCount, children }: Props) {
  const progress = itemCount ? Math.round((checkedCount / itemCount) * 100) : 0;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem_+_env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface lg:bottom-0 print:hidden">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
        <p className="text-sm tabular" aria-live="polite">
          <span className="font-semibold">
            {itemCount} {itemCount > 1 ? 'articles' : 'article'}
          </span>
          , {checkedCount} {checkedCount > 1 ? 'cochés' : 'coché'}
        </p>
        <div
          role="progressbar"
          aria-label="Articles cochés"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <div className="ml-auto text-sm">{children}</div>
      </div>
    </div>
  );
}
