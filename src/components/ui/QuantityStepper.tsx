import { Minus, Plus, Trash2 } from 'lucide-react';

interface Props {
  /** Nom complet de l'article, pour des libellés de boutons explicites au lecteur d'écran. */
  label: string;
  display: string;
  /** Vrai quand un retrait supplémentaire supprime l'article de la liste. */
  isLast: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: 'md' | 'sm';
}

export function QuantityStepper({
  label,
  display,
  isLast,
  onIncrement,
  onDecrement,
  size = 'md',
}: Props) {
  const button =
    size === 'md'
      ? 'grid size-10 place-items-center rounded-full hover:bg-surface-2 active:scale-95'
      : 'grid size-8 place-items-center rounded-full hover:bg-surface-2 active:scale-95';
  const iconSize = size === 'md' ? 18 : 16;
  return (
    <div
      role="group"
      aria-label={`Quantité de ${label}`}
      className="inline-flex items-center rounded-full border border-line-strong bg-surface"
    >
      <button
        type="button"
        className={button}
        onClick={onDecrement}
        aria-label={isLast ? `Retirer ${label} de la liste` : `Diminuer la quantité de ${label}`}
      >
        {isLast ? <Trash2 size={iconSize} aria-hidden /> : <Minus size={iconSize} aria-hidden />}
      </button>
      <output
        aria-live="polite"
        className={`min-w-[3.25rem] px-1 text-center font-display font-semibold tabular ${size === 'md' ? 'text-lg' : 'text-base'}`}
      >
        {display}
      </output>
      <button
        type="button"
        className={button}
        onClick={onIncrement}
        aria-label={`Augmenter la quantité de ${label}`}
      >
        <Plus size={iconSize} aria-hidden />
      </button>
    </div>
  );
}
