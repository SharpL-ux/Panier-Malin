import { CATEGORIES } from '../data/categories';
import type { Store } from '../types/stores';
import { defaultListName, formatFrDate, toIsoDate } from '../utils/dates';
import { formatCents } from '../utils/money';
import { packLabel, productQuantityLabel } from '../utils/productLabels';
import { normalizeText } from '../utils/text';
import { referenceAt } from './catalog';
import { rowExtremes, type Comparison, type Line } from './comparator';
import { itemCost, type PriceGetter } from './pricing';
import { storeLabel } from './stores';

/**
 * Contenu des PDF, calculé à part du rendu pour être testé. Les polices standard des PDF
 * (Helvetica) ne couvrent que le jeu Windows-1252 : pas d'emoji, ni d'espaces insécables
 * fines (produites par le formatage des prix en français), remplacées par des espaces.
 */
export function pdfText(value: string): string {
  return value
    .replace(/[\u00A0\u202F\u2009\u2007]/g, ' ')
    .replace(/[\u2010\u2011\u2012]/g, '-')
    .replace(
      /[^\x20-\x7E\u00A1-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/g,
      '',
    )
    .replace(/ {2,}/g, ' ')
    .trim();
}

export interface PdfOptions {
  showPrices: boolean;
  /** Marque à prendre en rayon et format. */
  showDetails: boolean;
  showNotes: boolean;
}

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  showPrices: true,
  showDetails: true,
  showNotes: true,
};

export interface SheetRow {
  section: string;
  /** Première ligne d'un rayon : le PDF affiche alors le nom du rayon. */
  sectionStart: boolean;
  name: string;
  detail?: string;
  quantity: string;
  price?: string;
  note?: string;
}

export interface StoreSheet {
  fileName: string;
  title: string;
  subtitle: string;
  showPrices: boolean;
  rows: SheetRow[];
  total?: string;
  notes: string[];
}

export interface StoreSheetRequest {
  listName: string;
  weekOf: string;
  /** Magasin de la feuille ; null pour une liste sans magasin (et sans prix). */
  store: Store | null;
  lines: Line[];
  priceAt: PriceGetter;
  options: PdfOptions;
  today: Date;
}

const slug = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** « Courses du samedi, semaine du 28/09/2026, 3 articles », sans répéter la semaine si le nom la donne déjà. */
function subtitleOf(listName: string, weekOf: string, count: number): string {
  const week = listName === defaultListName(weekOf) ? '' : `, semaine du ${formatFrDate(weekOf)}`;
  return pdfText(`${listName}${week}, ${count} ${count > 1 ? 'articles' : 'article'}`);
}

const SOURCES =
  'Prix indicatifs : relevés Open Prices (prices.openfoodfacts.org, licence ODbL) et vos saisies';

/** Feuille de courses pour un magasin, dans l'ordre des rayons, avec des cases à cocher. */
export function buildStoreSheet(req: StoreSheetRequest): StoreSheet {
  const aisle = new Map(CATEGORIES.map((c) => [c.id, c]));
  const rank = (l: Line) => aisle.get(l.product.categoryId)?.aisleOrder ?? Number.MAX_SAFE_INTEGER;
  const sorted = [...req.lines].sort((a, b) => rank(a) - rank(b));
  const showPrices = req.store !== null && req.options.showPrices;
  let previous = '';
  let total = 0;
  let priced = 0;
  let missing = 0;
  let fallback = false;
  const dates: string[] = [];

  const rows: SheetRow[] = sorted.map(({ item, product }) => {
    const section = pdfText(aisle.get(product.categoryId)?.label ?? 'Autres');
    const sectionStart = section !== previous;
    previous = section;
    const ref = req.store?.enseigne ? referenceAt(product, req.store.enseigne) : undefined;
    const detail = [ref?.brand ?? product.brand, packLabel(product)].filter(Boolean).join(', ');
    let price: string | undefined;
    if (showPrices && req.store) {
      const selected = req.priceAt(product.id, req.store.id);
      const cents = selected ? itemCost(product, item.quantity, selected.observation) : null;
      if (selected && cents !== null) {
        total += cents;
        priced += 1;
        dates.push(selected.observation.date);
        fallback ||= selected.fallback;
        price = `${formatCents(cents)}${selected.fallback ? ' ~' : ''}${selected.stale ? ' (ancien)' : ''}`;
      } else missing += 1;
    }
    return {
      section,
      sectionStart,
      name: pdfText(product.name),
      ...(req.options.showDetails && detail ? { detail: pdfText(detail) } : {}),
      quantity: pdfText(productQuantityLabel(product, item.quantity)),
      ...(price ? { price: pdfText(price) } : {}),
      ...(req.options.showNotes && item.note ? { note: pdfText(item.note) } : {}),
    };
  });

  const count = req.lines.length;
  const sortedDates = [...dates].sort();
  const notes: string[] = [];
  if (showPrices) {
    const range = sortedDates.length
      ? `, relevés du ${formatFrDate(sortedDates[0]!)} au ${formatFrDate(sortedDates[sortedDates.length - 1]!)}`
      : '';
    notes.push(`${SOURCES}${range}.`);
    if (fallback) notes.push('~ : prix relevé dans un autre magasin de la même enseigne.');
    if (missing) notes.push('? : prix inconnu, à vérifier en magasin.');
  }
  notes.push(`Liste créée avec Panier malin le ${formatFrDate(toIsoDate(req.today))}.`);

  const label = req.store ? storeLabel(req.store) : null;
  return {
    fileName: `panier-malin-${slug(label ?? 'liste')}-${req.weekOf}.pdf`,
    title: pdfText(label ? `Courses chez ${label}` : req.listName),
    subtitle: subtitleOf(req.listName, req.weekOf, count),
    showPrices,
    rows,
    ...(showPrices && priced > 0
      ? {
          total: pdfText(
            `Total estimé : ${formatCents(total)}${missing ? ` (${priced} articles sur ${count} avec prix)` : ''}`,
          ),
        }
      : {}),
    notes: notes.map(pdfText),
  };
}

export interface ComparisonSheet {
  fileName: string;
  title: string;
  subtitle: string;
  columns: string[];
  rows: { name: string; quantity: string; cells: string[]; best: boolean[] }[];
  totalLabel: string;
  totals: string[];
  coverage: string[];
  notes: string[];
}

export interface ComparisonSheetRequest {
  listName: string;
  weekOf: string;
  lines: Line[];
  stores: Store[];
  comparison: Comparison;
  today: Date;
}

/** Tableau comparatif article × magasin, pour une page A4 en paysage. */
export function buildComparisonSheet(req: ComparisonSheetRequest): ComparisonSheet {
  const rows = req.lines.map((line, r) => {
    const row = req.comparison.matrix[r] ?? [];
    const extremes = rowExtremes(row);
    return {
      name: pdfText(line.product.name),
      quantity: pdfText(productQuantityLabel(line.product, line.item.quantity)),
      cells: req.stores.map((_, c) => {
        const cell = row[c];
        return cell
          ? pdfText(`${formatCents(cell.cents)}${cell.selected.fallback ? ' ~' : ''}`)
          : '-';
      }),
      best: req.stores.map((_, c) => Boolean(extremes && row[c] && row[c].cents === extremes.min)),
    };
  });
  const totals = req.stores.map((s) => req.comparison.totals.find((t) => t.storeId === s.id));
  const count = req.lines.length;
  return {
    fileName: `panier-malin-comparatif-${req.weekOf}.pdf`,
    title: 'Comparatif des prix',
    subtitle: subtitleOf(req.listName, req.weekOf, count),
    columns: req.stores.map((s) => pdfText(storeLabel(s))),
    rows,
    totalLabel:
      req.comparison.mode === 'communs' ? 'Total des articles communs' : 'Total des prix connus',
    totals: totals.map((t) => pdfText(formatCents(t?.totalCents ?? 0))),
    coverage: totals.map((t) => `${t?.pricedCount ?? 0}/${req.comparison.itemCount} articles`),
    notes: [
      'En gras : le prix le plus bas de la ligne. ~ : prix relevé dans un autre magasin de la même enseigne. - : prix inconnu.',
      `${SOURCES}.`,
      `Comparatif créé avec Panier malin le ${formatFrDate(toIsoDate(req.today))}.`,
    ].map(pdfText),
  };
}
