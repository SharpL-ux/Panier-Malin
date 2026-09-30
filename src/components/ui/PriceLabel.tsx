import type { RefUnit } from '../../types/catalog';
import { formatCents } from '../../utils/money';
import { REF_UNIT_LABEL } from '../../utils/units';

export interface PriceLabelValue {
  cents: number;
  unitCents: number | null;
  refUnit: RefUnit;
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
  return (
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
  );
}
