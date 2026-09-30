function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Date locale au format AAAA-MM-JJ (sans conversion UTC, qui décalerait d'un jour le soir). */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Lundi de la semaine de `date`, au format AAAA-MM-JJ. */
export function mondayOf(date: Date): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const shift = (copy.getDay() + 6) % 7; // dimanche = 6 jours après lundi
  copy.setDate(copy.getDate() - shift);
  return toIsoDate(copy);
}

/** JJ/MM/AAAA */
export function formatFrDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function defaultListName(weekOf: string): string {
  return `Semaine du ${formatFrDate(weekOf)}`;
}
