import { CATEGORIES } from '../../src/data/categories';
import { ENSEIGNES } from '../../src/data/enseignes';
import type {
  CategoryId,
  EnseigneId,
  Pack,
  Product,
  StoreReference,
} from '../../src/types/catalog';
import { normalizeText } from '../../src/utils/text';
import { formatPack } from '../../src/utils/units';

/**
 * Catalogue en Markdown : un tableau par rayon, modifiable à la main puis réintégré.
 * Les informations techniques (codes Open Food Facts, codes-barres) restent attachées à l'id.
 */

const KILO: Pack = { count: 1, size: 1000, unit: 'g' };
const samePack = (a: Pack, b: Pack) =>
  a.count === b.count && a.size === b.size && a.unit === b.unit;
const enseigneLabel = (id: EnseigneId) => ENSEIGNES.find((e) => e.id === id)?.label ?? id;
const ENSEIGNE_BY_NAME = new Map<string, EnseigneId>(
  ENSEIGNES.flatMap((e) => [
    [normalizeText(e.label), e.id],
    [normalizeText(e.id), e.id],
  ]),
);
for (const [alias, id] of [
  ['leclerc', 'leclerc'],
  ['e leclerc', 'leclerc'],
  ['marka', 'marka'],
  ['h market', 'hmarket'],
] as const) {
  ENSEIGNE_BY_NAME.set(normalizeText(alias), id);
}

const escapeCell = (value: string) => value.replace(/\|/g, '\\|');

export function formatCell(product: Product): string {
  if (!product.soldByWeight) return formatPack(product.pack);
  return samePack(product.pack, KILO) ? 'au poids' : `au poids, ${formatPack(product.pack)}`;
}

export function referencesCell(product: Product): string {
  return product.references
    .map(
      (r) => `${enseigneLabel(r.enseigne)} : ${r.brand}${r.pack ? ` (${formatPack(r.pack)})` : ''}`,
    )
    .join(' ; ');
}

/** « 500 g », « 1,5 kg », « 33 cl », « 6 × 1 L », « 12 pièces » → conditionnement. */
export function parsePack(text: string): Pack | null {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[\u00a0\u202f]/g, ' ');
  const m = /^(?:(\d+)\s*[×x*]\s*)?(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l|pièces?|pieces?)$/.exec(t);
  if (!m) return null;
  const count = m[1] ? Number(m[1]) : 1;
  const value = Number(m[2]!.replace(',', '.'));
  const unit = m[3]!;
  const [factor, packUnit]: [number, Pack['unit']] =
    unit === 'g'
      ? [1, 'g']
      : unit === 'kg'
        ? [1000, 'g']
        : unit === 'ml'
          ? [1, 'ml']
          : unit === 'cl'
            ? [10, 'ml']
            : unit === 'l'
              ? [1000, 'ml']
              : [1, 'piece'];
  const size = Math.round(value * factor * 1000) / 1000;
  if (!Number.isInteger(size) || size <= 0 || count < 1) return null;
  return { count, size, unit: packUnit };
}

function parseFormat(text: string): { pack: Pack; soldByWeight: boolean } | null {
  const t = text.trim().toLowerCase();
  if (t === 'au poids' || t === 'au kg' || t === 'vrac') return { pack: KILO, soldByWeight: true };
  const weighed = /^au poids\s*,\s*(.+)$/.exec(t);
  if (weighed) {
    const pack = parsePack(weighed[1]!);
    return pack ? { pack, soldByWeight: true } : null;
  }
  const pack = parsePack(t);
  return pack ? { pack, soldByWeight: false } : null;
}

const MODE_EMPLOI = `## Mode d'emploi

Modifiez les tableaux, puis renvoyez le fichier : il sera intégré tel quel au catalogue de l'application.

- **Une section par rayon**, dans l'ordre de passage en magasin. Ne touchez pas à la ligne \`<!-- rayon: … -->\` sous chaque titre (elle est invisible une fois le fichier affiché) ; pour renommer un rayon ou changer son icône, modifiez seulement le titre.
- **Une ligne par produit.** Supprimez une ligne pour retirer un produit ; ajoutez-en une pour en créer un, en laissant la colonne \`id\` vide. Pour changer un produit de rayon, déplacez sa ligne dans l'autre tableau.
- **Icône** : un emoji.
- **Format** : la quantité d'un conditionnement, par exemple \`500 g\`, \`1 kg\`, \`1,5 kg\`, \`33 cl\`, \`1 L\`, \`12 pièces\`, \`6 × 1 L\`, \`4 × 125 g\`. Pour le vrac vendu au poids : \`au poids\`.
- **Certifié halal** : \`oui\` pour la viande, la volaille et la charcuterie certifiées ; vide pour le reste. Le catalogue reste entièrement halal : ni porc, ni alcool, ni gélatine de porc.
- **Marques par enseigne** : la gamme la moins chère à prendre dans chaque enseigne, séparées par des points-virgules, par exemple \`Lidl : Milbona ; Carrefour : Carrefour Classic\`. Si le format diffère de celui du produit, ajoutez-le entre parenthèses : \`Lidl : Toujours (48 pièces)\`. Enseignes possibles : ${ENSEIGNES.map((e) => e.label).join(', ')}.
- **Prix (€)** : facultatif, voir la section suivante.
- **id** : ne le modifiez pas ; il relie la ligne au produit existant, à ses codes-barres et à vos listes.
- Gardez les barres verticales \`|\` qui séparent les colonnes.
`;

const PRICES_HELP = `## Vos prix (facultatif)

L'application n'embarque pas de prix dans son catalogue : ils viennent d'Open Prices, avec leur date et leur magasin, ou de vos saisies. Si vous remplissez la colonne « Prix (€) », indiquez ci-dessous le magasin et la date : ils deviendront vos prix saisis pour ce magasin. Pour le vrac au poids, donnez le prix au kilo ; sinon, le prix d'un conditionnement.

- Magasin de ces prix : 
- Date des prix (JJ/MM/AAAA) : 
`;

const HEADER =
  '| Icône | Produit | Format | Certifié halal | Marques par enseigne | Prix (€) | id |';

export function catalogueToMarkdown(products: Product[], today: Date): string {
  const date = today.toLocaleDateString('fr-FR');
  const sorted = [...CATEGORIES].sort((a, b) => a.aisleOrder - b.aisleOrder);
  const out = [
    '# Catalogue Panier malin',
    '',
    `${products.length} produits dans ${CATEGORIES.length} rayons, exportés le ${date}.`,
    '',
    MODE_EMPLOI,
    PRICES_HELP,
  ];
  for (const category of sorted) {
    out.push(`## ${category.icon} ${category.label}`, `<!-- rayon: ${category.id} -->`, '', HEADER);
    out.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const p of products.filter((x) => x.categoryId === category.id)) {
      const cells = [
        p.icon,
        escapeCell(p.name),
        formatCell(p),
        p.halal ? 'oui' : '',
        escapeCell(referencesCell(p)),
        '',
        p.id,
      ];
      out.push(`| ${cells.join(' | ')} |`.replace(/ {2,}\|/g, ' |'));
    }
    out.push('');
  }
  return out.join('\n');
}

// ------------------------------------------------------------------ Lecture

export interface ParsedRow {
  line: number;
  id: string;
  categoryId: CategoryId;
  icon: string;
  name: string;
  pack: Pack;
  soldByWeight: boolean;
  halal: boolean;
  references: { enseigne: EnseigneId; brand: string; pack?: Pack }[];
  priceCents: number | null;
}

export interface ParsedCatalogue {
  rows: ParsedRow[];
  /** Changements de rayons (titre, icône, ordre) à reporter dans src/data/categories.ts. */
  categoryNotes: string[];
  store: string;
  date: string | null;
  errors: string[];
}

function splitRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '\\' && line[i + 1] === '|') {
      current += '|';
      i += 1;
    } else if (ch === '|') {
      cells.push(current);
      current = '';
    } else current += ch;
  }
  cells.push(current);
  const trimmed = line.trim();
  if (trimmed.startsWith('|')) cells.shift();
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) cells.pop();
  return cells.map((c) => c.trim());
}

function parseEuros(text: string): number | null | undefined {
  const t = text.replace(/€/g, '').replace(/[\s\u00a0\u202f]/g, '');
  if (t === '') return null;
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(t);
  if (!m) return undefined;
  return Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'));
}

function parseDate(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseCatalogueMarkdown(text: string): ParsedCatalogue {
  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  const categoryNotes: string[] = [];
  const order: CategoryId[] = [];
  let heading: { icon: string; label: string } | null = null;
  let categoryId: CategoryId | null = null;
  let columns: string[] | null = null;
  let store = '';
  let dateText = '';

  const field = (line: string, label: string): string | null => {
    const clean = line.replace(/^[-*]\s*/, '').replace(/\*\*/g, '');
    if (!normalizeText(clean).startsWith(normalizeText(label))) return null;
    const colon = clean.indexOf(':');
    return colon >= 0 ? clean.slice(colon + 1).trim() : '';
  };
  const startTable = (n: number, cells: string[]) => {
    columns = null;
    if (!heading) {
      errors.push(`Ligne ${n} : tableau sans titre de rayon au-dessus.`);
      return;
    }
    const byLabel = CATEGORIES.find(
      (c) => normalizeText(c.label) === normalizeText(heading!.label),
    );
    const category = CATEGORIES.find((c) => c.id === categoryId) ?? byLabel;
    if (!category) {
      errors.push(
        `Ligne ${n} : rayon inconnu « ${heading.label} ». Un nouveau rayon doit d'abord être créé dans src/data/categories.ts.`,
      );
      return;
    }
    categoryId = category.id;
    if (order.includes(category.id)) {
      errors.push(`Ligne ${n} : le rayon « ${category.label} » apparaît deux fois.`);
      return;
    }
    order.push(category.id);
    if (heading.label && heading.label !== category.label) {
      categoryNotes.push(`Rayon « ${category.label} » renommé en « ${heading.label} ».`);
    }
    if (heading.icon && heading.icon !== category.icon) {
      categoryNotes.push(
        `Rayon « ${category.label} » : icône ${category.icon} remplacée par ${heading.icon}.`,
      );
    }
    columns = cells.map((c) => normalizeText(c));
  };

  text.split(/\r?\n/).forEach((raw, index) => {
    const n = index + 1;
    const line = raw.trim();
    const storeValue = field(line, 'Magasin de ces prix');
    if (storeValue !== null) {
      store = storeValue;
      return;
    }
    const dateValue = field(line, 'Date des prix');
    if (dateValue !== null) {
      dateText = dateValue;
      return;
    }
    if (/^##\s+/.test(line)) {
      const words = line.replace(/^##\s+/, '').split(/\s+/);
      const hasIcon = words.length > 1 && !/[\p{L}\p{N}]/u.test(words[0]!);
      heading = {
        icon: hasIcon ? words[0]! : '',
        label: (hasIcon ? words.slice(1) : words).join(' '),
      };
      categoryId = null;
      columns = null;
      return;
    }
    const comment = /^<!--\s*rayon\s*:\s*([a-z0-9-]+)\s*-->$/.exec(line);
    if (comment) {
      categoryId = comment[1] as CategoryId;
      return;
    }
    if (!line.startsWith('|')) return;
    const cells = splitRow(line);
    if (cells.some((c) => normalizeText(c) === 'produit')) {
      startTable(n, cells);
      return;
    }
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return;
    const cols = columns as string[] | null;
    if (!cols || !categoryId) return;
    const cell = (prefix: string) => {
      const i = cols.findIndex((c) => c.startsWith(prefix));
      return i >= 0 ? (cells[i] ?? '') : '';
    };
    const name = cell('produit');
    const id = cell('id');
    if (!name && !id && cells.every((c) => c === '')) return;
    const where = `Ligne ${n} (${name || id || 'sans nom'})`;
    if (!name) errors.push(`${where} : nom du produit manquant.`);
    const icon = cell('icon');
    if (!icon) errors.push(`${where} : icône manquante.`);
    const format = parseFormat(cell('format'));
    if (!format)
      errors.push(
        `${where} : format « ${cell('format')} » non reconnu (exemples : 500 g, 1 L, 6 × 1 L, 12 pièces, au poids).`,
      );
    const halalText = normalizeText(cell('certifie'));
    const halal = ['oui', 'x', '✓', 'o'].includes(halalText);
    if (!halal && !['', 'non', '-'].includes(halalText))
      errors.push(`${where} : « Certifié halal » doit valoir oui ou rester vide.`);
    const references: ParsedRow['references'] = [];
    const refsText = cell('marques');
    for (const part of refsText
      .split(';')
      .map((p) => p.trim())
      .filter((p) => p && p !== '—' && p !== '-')) {
      const m = /^(.+?)\s*:\s*(.+?)(?:\s*\(([^()]+)\))?$/.exec(part);
      const enseigne = m ? ENSEIGNE_BY_NAME.get(normalizeText(m[1]!)) : undefined;
      if (!m || !enseigne) {
        errors.push(
          `${where} : « ${part} » doit s'écrire « Enseigne : Marque », avec une enseigne parmi ${ENSEIGNES.map((e) => e.label).join(', ')}.`,
        );
        continue;
      }
      if (references.some((r) => r.enseigne === enseigne)) {
        errors.push(`${where} : deux marques pour ${enseigneLabel(enseigne)}.`);
        continue;
      }
      const refPack = m[3] ? parsePack(m[3]) : undefined;
      if (m[3] && !refPack) {
        errors.push(`${where} : format « ${m[3]} » de la marque ${m[2]} non reconnu.`);
        continue;
      }
      references.push({ enseigne, brand: m[2]!.trim(), ...(refPack ? { pack: refPack } : {}) });
    }
    const price = parseEuros(cell('prix'));
    if (price === undefined)
      errors.push(`${where} : prix « ${cell('prix')} » non reconnu (exemple : 1,99).`);
    if (!name || !icon || !format) return;
    rows.push({
      line: n,
      id,
      categoryId,
      icon,
      name,
      pack: format.pack,
      soldByWeight: format.soldByWeight,
      halal,
      references,
      priceCents: price ?? null,
    });
  });

  const expected = [...CATEGORIES].sort((a, b) => a.aisleOrder - b.aisleOrder).map((c) => c.id);
  const kept = expected.filter((id) => order.includes(id));
  if (order.join() !== kept.join())
    categoryNotes.push(`Nouvel ordre des rayons : ${order.join(', ')}.`);
  const missing = expected.filter((id) => !order.includes(id));
  if (missing.length)
    categoryNotes.push(
      `Rayons absents du fichier (leurs produits seront retirés) : ${missing.join(', ')}.`,
    );
  const hasPrices = rows.some((r) => r.priceCents !== null);
  const date = dateText ? parseDate(dateText) : null;
  if (hasPrices && !store) errors.push('Des prix sont remplis : indiquez « Magasin de ces prix ».');
  if (hasPrices && !date)
    errors.push('Des prix sont remplis : indiquez « Date des prix » au format JJ/MM/AAAA.');
  return { rows, categoryNotes, store, date, errors };
}

// ------------------------------------------------------------------ Intégration

export interface CatalogueChanges {
  products: Product[];
  added: string[];
  removed: string[];
  changed: string[];
  prices: { productId: string; cents: number; per: 'kg' | 'pack' }[];
  errors: string[];
}

const slug = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Produits rangés par rayon (ordre de passage), puis dans l'ordre du fichier. */
export function sortByAisle(products: Product[]): Product[] {
  const rank = new Map(CATEGORIES.map((c) => [c.id, c.aisleOrder]));
  return products
    .map((p, i) => ({ p, i }))
    .sort(
      (a, b) => (rank.get(a.p.categoryId) ?? 99) - (rank.get(b.p.categoryId) ?? 99) || a.i - b.i,
    )
    .map((x) => x.p);
}

export function applyCatalogueEdits(
  existing: Product[],
  parsed: ParsedCatalogue,
): CatalogueChanges {
  const errors = [...parsed.errors];
  const byId = new Map(existing.map((p) => [p.id, p]));
  const used = new Set(existing.map((p) => p.id));
  const seen = new Set<string>();
  const products: Product[] = [];
  const added: string[] = [];
  const changed: string[] = [];
  const prices: CatalogueChanges['prices'] = [];

  for (const row of parsed.rows) {
    const before = row.id ? byId.get(row.id) : undefined;
    if (row.id && !before) {
      errors.push(
        `Ligne ${row.line} : id inconnu « ${row.id} ». Laissez la colonne vide pour un nouveau produit.`,
      );
      continue;
    }
    if (row.id && seen.has(row.id)) {
      errors.push(
        `Ligne ${row.line} : « ${row.id} » apparaît deux fois. Videz la colonne id de la copie.`,
      );
      continue;
    }
    let id = row.id;
    if (!id) {
      const base = slug(row.name) || 'produit';
      id = base;
      for (let k = 2; used.has(id); k += 1) id = `${base}-${k}`;
      used.add(id);
    }
    seen.add(id);
    const references: StoreReference[] = row.references.map((r) => {
      const old = before?.references.find((x) => x.enseigne === r.enseigne);
      // Le code-barres ne suit que si la marque est restée la même.
      const ean = old && normalizeText(old.brand) === normalizeText(r.brand) ? old.ean : '';
      return { enseigne: r.enseigne, brand: r.brand, ean, ...(r.pack ? { pack: r.pack } : {}) };
    });
    const product: Product = {
      id,
      name: row.name,
      categoryId: row.categoryId,
      icon: row.icon,
      pack: row.pack,
      soldByWeight: row.soldByWeight,
      halal: row.halal,
      references,
      ...(before?.offCategoryTag ? { offCategoryTag: before.offCategoryTag } : {}),
    };
    products.push(product);
    if (!before) added.push(row.name);
    else if (JSON.stringify(before) !== JSON.stringify(product)) changed.push(row.name);
    if (row.priceCents !== null)
      prices.push({ productId: id, cents: row.priceCents, per: row.soldByWeight ? 'kg' : 'pack' });
  }
  const removed = existing.filter((p) => !seen.has(p.id)).map((p) => p.name);
  return { products: sortByAisle(products), added, removed, changed, prices, errors };
}
