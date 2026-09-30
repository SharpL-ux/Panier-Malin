/**
 * Tous les montants sont manipulés en centimes entiers pour éviter les erreurs
 * d'arrondi des nombres à virgule flottante (0,1 + 0,2 ≠ 0,3).
 */

const DECIMAL_RE = /^(\d+)(?:[.,](\d{1,3}))?$/;

/**
 * Convertit un prix en euros (chaîne "1.29", "1,29" ou nombre 1.29) en centimes, sans
 * passer par une multiplication flottante. Trois décimales maximum, arrondi au centime.
 * Renvoie null si la valeur n'est pas un prix valide.
 */
export function parseEuroToCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const text =
    typeof value === 'number' ? (Number.isFinite(value) ? value.toFixed(3) : '') : value.trim();
  const match = DECIMAL_RE.exec(text);
  if (!match) return null;
  const euros = Number(match[1]);
  const decimals = (match[2] ?? '').padEnd(3, '0');
  const thousandths = euros * 1000 + Number(decimals);
  return Math.round(thousandths / 10);
}

const EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function formatCents(cents: number): string {
  return EURO.format(cents / 100);
}

/** Prix unitaire (au kg, au L ou à la pièce) en centimes, arrondi au centime. */
export function unitPriceCents(priceCents: number, refQuantity: number): number | null {
  if (!(refQuantity > 0)) return null;
  return Math.round(priceCents / refQuantity);
}
