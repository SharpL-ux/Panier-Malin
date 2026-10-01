import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../data/categories';
import { getter, line, store } from '../test/builders';
import { compareStores } from './comparator';
import { buildComparisonSheet, buildStoreSheet, DEFAULT_PDF_OPTIONS, pdfText } from './pdfModel';

const [first, second] = CATEGORIES.slice().sort((a, b) => a.aisleOrder - b.aisleOrder);
const lidl = store('op-1', { name: 'Lidl', enseigne: 'lidl', city: 'Courbevoie' });
const carrefour = store('op-2', {
  name: 'Carrefour Market',
  enseigne: 'carrefour',
  city: 'Courbevoie',
});
const lines = [
  line('riz', 2, {
    name: 'Riz basmati',
    categoryId: second!.id,
    references: [{ enseigne: 'lidl', brand: 'Golden Sun', ean: '' }],
  }),
  line('lait', 1, { name: 'Lait demi-écrémé UHT', categoryId: first!.id }, 'bien frais 🥛'),
  line('sel', 1, { name: 'Sel fin', categoryId: second!.id }),
];
const prices = getter(
  { riz: { 'op-1': 189, 'op-2': 210 }, lait: { 'op-1': '≈95', 'op-2': '!99' } },
  '2026-09-20',
);
const today = new Date(2026, 9, 1);
const base = {
  listName: 'Semaine du 28/09/2026',
  weekOf: '2026-09-28',
  priceAt: prices,
  options: DEFAULT_PDF_OPTIONS,
  today,
};

describe('texte des PDF', () => {
  it('garde accents, œ et euro, remplace les espaces insécables et retire les emoji', () => {
    expect(pdfText('1,99\u00A0€ et 2\u202F000 œufs 🥚 crème')).toBe('1,99 € et 2 000 œufs crème');
  });
});

describe('feuille de courses par magasin', () => {
  it('suit l’ordre des rayons, avec la marque à prendre, les notes et les prix', () => {
    const sheet = buildStoreSheet({ ...base, store: lidl, lines });
    expect(sheet.title).toBe('Courses chez Lidl, Courbevoie');
    expect(sheet.subtitle).toBe('Semaine du 28/09/2026, 3 articles');
    expect(
      buildStoreSheet({ ...base, listName: 'Courses du samedi', store: lidl, lines }).subtitle,
    ).toBe('Courses du samedi, semaine du 28/09/2026, 3 articles');
    expect(sheet.fileName).toBe('panier-malin-lidl-courbevoie-2026-09-28.pdf');
    expect(sheet.rows.map((r) => [r.name, r.sectionStart])).toEqual([
      ['Lait demi-écrémé UHT', true],
      ['Riz basmati', true],
      ['Sel fin', false],
    ]);
    expect(sheet.rows[0]).toMatchObject({ price: '0,95 € ~', note: 'bien frais' });
    expect(sheet.rows[1]).toMatchObject({
      detail: expect.stringMatching(/^Golden Sun, /),
      price: '3,78 €',
    });
    expect(sheet.rows[2]!.price).toBeUndefined();
    expect(sheet.total).toBe('Total estimé : 4,73 € (2 articles sur 3 avec prix)');
    expect(sheet.notes).toEqual([
      'Prix indicatifs : relevés Open Prices (prices.openfoodfacts.org, licence ODbL) et vos saisies, relevés du 20/09/2026 au 20/09/2026.',
      '~ : prix relevé dans un autre magasin de la même enseigne.',
      '? : prix inconnu, à vérifier en magasin.',
      'Liste créée avec Panier malin le 01/10/2026.',
    ]);
  });

  it('signale les relevés anciens et peut se passer des prix, des détails et des notes', () => {
    expect(buildStoreSheet({ ...base, store: carrefour, lines }).rows[0]!.price).toBe(
      '0,99 € (ancien)',
    );
    const plain = buildStoreSheet({
      ...base,
      store: lidl,
      lines,
      options: { showPrices: false, showDetails: false, showNotes: false },
    });
    expect(plain.showPrices).toBe(false);
    expect(plain.total).toBeUndefined();
    expect(
      plain.rows.every(
        (r) => r.price === undefined && r.detail === undefined && r.note === undefined,
      ),
    ).toBe(true);
    expect(buildStoreSheet({ ...base, store: null, lines }).fileName).toBe(
      'panier-malin-liste-2026-09-28.pdf',
    );
  });
});

describe('tableau comparatif', () => {
  it('met en avant le prix le plus bas de chaque ligne et donne les totaux', () => {
    const stores = [lidl, carrefour];
    const comparison = compareStores(lines, stores, prices, 'complet');
    const sheet = buildComparisonSheet({
      listName: base.listName,
      weekOf: base.weekOf,
      lines,
      stores,
      comparison,
      today,
    });
    expect(sheet.columns).toEqual(['Lidl, Courbevoie', 'Carrefour Market, Courbevoie']);
    expect(sheet.rows[0]).toMatchObject({
      name: 'Riz basmati',
      cells: ['3,78 €', '4,20 €'],
      best: [true, false],
    });
    expect(sheet.rows[1]!.cells).toEqual(['0,95 € ~', '0,99 €']);
    expect(sheet.rows[2]).toMatchObject({ cells: ['-', '-'], best: [false, false] });
    expect(sheet.totals).toEqual(['4,73 €', '5,19 €']);
    expect(sheet.coverage).toEqual(['2/3 articles', '2/3 articles']);
  });
});
