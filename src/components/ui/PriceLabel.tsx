import { Clock } from 'lucide-react';
import type { RefUnit } from '../../types/catalog';
import type { PriceSource } from '../../types/prices';
import { formatFrDate } from '../../utils/dates';
import { formatCents } from '../../utils/money';
import { REF_UNIT_LABEL } from '../../utils/units';

export interface PriceLabelValue {
  cents: number;
  unitCents: number | null;
  refUnit: RefUnit;
  /** Origine du prix, toujours affichée : magasin, date et source. */
  storeLabel?: string;
  date?: string;
  source?: PriceSource;
  stale?: boolean;
  fallbackFrom?: string;
}

/**
 * Étiquette de prix inspirée des étiquettes de rayon : les euros en grand, les centimes
 * en exposant, le prix au kilo ou au litre dessous. Sans prix, un cadre en pointillés
 * le signale sans dépendre de la couleur.
 */
export function PriceLabel({ value }: { value: PriceLabelValue | null }) {
  if (!value) {
    return (
      <p className="w-fit rounded-[4px] border border-dashed border-line-strong px-2 py-1 text-sm text-ink-soft">
        Prix non disponible
      </p>
    );
  }
  const text = formatCents(value.cents);
  const euros = Math.floor(value.cents / 100);
  const cents = String(value.cents % 100).padStart(2, '0');
  const origin = [
    value.storeLabel,
    value.date ? `le ${formatFrDate(value.date)}` : undefined,
    value.source === 'manuel'
      ? 'votre prix'
      : value.source === 'open-prices'
        ? 'Open Prices'
        : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <div className="space-y-1">
      <div className="inline-flex w-fit flex-col rounded-[4px] border border-line-strong bg-surface px-2.5 py-1">
        <span className="font-display leading-none font-bold tabular" aria-label={text}>
          <span className="text-3xl" aria-hidden>
            {euros}
          </span>
          <span className="align-top text-base" aria-hidden>
            ,{cents} €
          </span>
        </span>
        {value.unitCents !== null && (
          <span className="mt-0.5 text-xs text-ink-soft tabular">
            {formatCents(value.unitCents)} / {REF_UNIT_LABEL[value.refUnit]}
          </span>
        )}
      </div>
      {origin && <p className="text-xs text-ink-soft">{origin}</p>}
      {value.fallbackFrom && (
        <p className="text-xs">Relevé dans un autre magasin : {value.fallbackFrom}</p>
      )}
      {value.stale && (
        <p className="flex items-center gap-1 text-xs font-medium">
          <Clock size={12} aria-hidden />
          Relevé de plus de 3 mois
        </p>
      )}
    </div>
  );
}
