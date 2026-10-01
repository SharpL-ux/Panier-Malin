import { getEnseigne } from '../../src/data/enseignes';
import type { EnseigneId, Pack, Product } from '../../src/types/catalog';
import { isValidEan } from '../../src/utils/ean';
import { normalizeText } from '../../src/utils/text';
import { formatPack, refQuantity, refUnitOf } from '../../src/utils/units';

/**
 * Propositions de codes-barres pour les références du catalogue, à faire relire par une
 * personne avant de les appliquer. Rien ici n'écrit de code-barres sans validation.
 */

export interface Candidate {
  code: string;
  productName: string;
  brands: string;
  quantity: number | null;
  quantityUnit: string;
  priceCount: number;
}

export interface Suggestion {
  productId: string;
  productName: string;
  enseigne: EnseigneId;
  brand: string;
  expectedPack: string;
  candidate: Candidate;
  score: number;
}

const STOPWORDS = new Set([
  'de',
  'des',
  'du',
  'la',
  'le',
  'les',
  'en',
  'et',
  'au',
  'aux',
  'a',
  'l',
  'd',
  'pour',
]);

export function words(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/** Mots à chercher dans le nom du produit : le plus long d'abord (le plus discriminant), puis le premier. */
export function searchKeywords(name: string): string[] {
  const list = name.split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(normalizeText(w)));
  const longest = [...list].sort((a, b) => b.length - a.length)[0];
  return [...new Set([longest, list[0]].filter((w): w is string => Boolean(w)))];
}

/** Marque telle qu'on la cherche dans Open Food Facts (sans apostrophe finale : « Carrefour Classic »). */
export function brandQuery(brand: string): string {
  return brand.replace(/['’]+$/g, '').trim();
}

export function parseCandidate(raw: unknown): Candidate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const code = typeof r.code === 'string' ? r.code : '';
  if (!isValidEan(code)) return null;
  return {
    code,
    productName: typeof r.product_name === 'string' ? r.product_name : '',
    brands: typeof r.brands === 'string' ? r.brands : '',
    quantity:
      typeof r.product_quantity === 'number'
        ? r.product_quantity
        : Number(r.product_quantity) || null,
    quantityUnit: typeof r.product_quantity_unit === 'string' ? r.product_quantity_unit : '',
    priceCount: typeof r.price_count === 'number' ? r.price_count : 0,
  };
}

/** Le format déclaré par Open Food Facts correspond-il au format attendu (à 5 % près) ? */
export function packMatches(pack: Pack, candidate: Candidate): boolean {
  if (!candidate.quantity) return false;
  const unit = candidate.quantityUnit.toLowerCase();
  const factor: Record<string, number> = { g: 0.001, kg: 1, ml: 0.001, cl: 0.01, l: 1 };
  const f = factor[unit];
  if (f === undefined) return false;
  const expectedUnit = refUnitOf(pack);
  if ((expectedUnit === 'kg') !== ['g', 'kg'].includes(unit) || expectedUnit === 'piece')
    return false;
  const value = candidate.quantity * f;
  const expected = refQuantity(pack);
  return Math.abs(value - expected) / expected <= 0.05;
}

/** Score : mots du nom en commun, marque, format, puis popularité dans Open Prices. */
export function scoreCandidate(
  product: Product,
  brand: string,
  pack: Pack,
  candidate: Candidate,
): number {
  const expected = new Set(words(product.name));
  const found = new Set(words(candidate.productName));
  const common = [...expected].filter((w) => found.has(w)).length;
  // Sans aucun mot en commun, le format et la popularité ne suffisent pas (un jus d'orange d'1 L n'est pas du lait).
  if (common === 0) return 0;
  const brandOk = normalizeText(candidate.brands).includes(normalizeText(brandQuery(brand)));
  return (
    common * 10 +
    (brandOk ? 20 : 0) +
    (packMatches(pack, candidate) ? 15 : 0) +
    Math.min(candidate.priceCount, 9)
  );
}

export function rankCandidates(
  product: Product,
  enseigne: EnseigneId,
  candidates: Candidate[],
  limit = 3,
): Suggestion[] {
  const ref = product.references.find((r) => r.enseigne === enseigne);
  if (!ref) return [];
  const pack = ref.pack ?? product.pack;
  const seen = new Set<string>();
  return candidates
    .filter((c) => (seen.has(c.code) ? false : (seen.add(c.code), true)))
    .map((candidate) => ({
      productId: product.id,
      productName: product.name,
      enseigne,
      brand: ref.brand,
      expectedPack: formatPack(pack),
      candidate,
      score: scoreCandidate(product, ref.brand, pack, candidate),
    }))
    .filter((s) => s.score >= 20)
    .sort((a, b) => b.score - a.score || b.candidate.priceCount - a.candidate.priceCount)
    .slice(0, limit);
}

// ------------------------------------------------------------------ Fichier de relecture (CSV, séparateur « ; »)

export const CSV_HEADER = [
  'fiche',
  'nom_fiche',
  'enseigne',
  'marque',
  'format_attendu',
  'ean_propose',
  'nom_open_food_facts',
  'marques_open_food_facts',
  'quantite_open_food_facts',
  'nb_prix',
  'score',
  'lien',
  'valider',
];

const cell = (value: string | number) => {
  const text = String(value);
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(suggestions: Suggestion[]): string {
  const rows = suggestions.map((s) =>
    [
      s.productId,
      s.productName,
      getEnseigne(s.enseigne).label,
      s.brand,
      s.expectedPack,
      s.candidate.code,
      s.candidate.productName,
      s.candidate.brands,
      s.candidate.quantity ? `${s.candidate.quantity} ${s.candidate.quantityUnit}` : '',
      s.candidate.priceCount,
      s.score,
      `https://world.openfoodfacts.org/product/${s.candidate.code}`,
      '',
    ]
      .map(cell)
      .join(';'),
  );
  // BOM UTF-8 : le fichier s'ouvre correctement dans un tableur.
  return '\uFEFF' + [CSV_HEADER.join(';'), ...rows].join('\n') + '\n';
}

export function parseCsv(content: string): Record<string, string>[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const text = content.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ';') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      lines.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) lines.push([...row, field]);
  const [header, ...rest] = lines.filter((l) => l.some((v) => v.trim()));
  if (!header) return [];
  return rest.map((values) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (values[i] ?? '').trim()])),
  );
}

const ENSEIGNE_BY_LABEL = new Map(
  (['carrefour', 'lidl', 'leclerc', 'hmarket', 'marka'] as const).map((id) => [
    normalizeText(getEnseigne(id).label),
    id,
  ]),
);

export interface ApplyResult {
  products: Product[];
  applied: { productId: string; enseigne: EnseigneId; ean: string }[];
  errors: string[];
}

/** Applique les lignes marquées « oui » dans la colonne « valider ». */
export function applyValidated(products: Product[], rows: Record<string, string>[]): ApplyResult {
  const errors: string[] = [];
  const applied: ApplyResult['applied'] = [];
  const next = products.map((p) => ({ ...p, references: p.references.map((r) => ({ ...r })) }));
  const byId = new Map(next.map((p) => [p.id, p]));
  for (const [index, row] of rows.entries()) {
    if (!['oui', 'o', 'yes', 'x'].includes(normalizeText(row.valider ?? ''))) continue;
    const line = `Ligne ${index + 2}`;
    const product = byId.get(row.fiche ?? '');
    const enseigne = ENSEIGNE_BY_LABEL.get(normalizeText(row.enseigne ?? ''));
    const ean = (row.ean_propose ?? '').replace(/\s/g, '');
    if (!product) errors.push(`${line} : fiche inconnue (${row.fiche})`);
    else if (!enseigne) errors.push(`${line} : enseigne inconnue (${row.enseigne})`);
    else if (!isValidEan(ean)) errors.push(`${line} : code-barres invalide (${ean})`);
    else {
      const ref = product.references.find((r) => r.enseigne === enseigne);
      if (!ref) errors.push(`${line} : ${product.id} n'a pas de référence chez ${row.enseigne}`);
      else if (ref.ean && ref.ean !== ean)
        errors.push(`${line} : ${product.id} a déjà le code ${ref.ean} chez ${row.enseigne}`);
      else {
        ref.ean = ean;
        applied.push({ productId: product.id, enseigne, ean });
      }
    }
  }
  return { products: next, applied, errors };
}

/** Écrit le catalogue au format du dépôt : une fiche par ligne. */
export function formatProductsJson(products: Product[]): string {
  return '[\n' + products.map((p) => '  ' + JSON.stringify(p)).join(',\n') + '\n]\n';
}
