import { describe, expect, it } from 'vitest';
import type { Product } from '../../src/types/catalog';
import {
  applyValidated,
  brandQuery,
  formatProductsJson,
  packMatches,
  parseCandidate,
  parseCsv,
  rankCandidates,
  searchKeywords,
  toCsv,
} from './eanSuggestions';

const lait: Product = {
  id: 'lait-demi-ecreme-uht',
  name: 'Lait demi-écrémé UHT',
  categoryId: 'cremerie',
  icon: '🥛',
  pack: { count: 1, size: 1000, unit: 'ml' },
  soldByWeight: false,
  halal: false,
  references: [
    { enseigne: 'lidl', brand: 'Milbona', ean: '' },
    { enseigne: 'carrefour', brand: "Carrefour Classic'", ean: '' },
  ],
};
const raw = (
  code: string,
  name: string,
  brands: string,
  qty: number,
  unit: string,
  prices = 3,
) => ({
  code,
  product_name: name,
  brands,
  product_quantity: qty,
  product_quantity_unit: unit,
  price_count: prices,
});

describe('propositions de codes-barres', () => {
  it('choisit des mots-clés discriminants et nettoie la marque', () => {
    expect(searchKeywords('Lait demi-écrémé UHT')).toEqual(['demi-écrémé', 'Lait']);
    expect(brandQuery("Carrefour Classic'")).toBe('Carrefour Classic');
  });

  it('écarte les codes invalides et compare les formats à 5 % près', () => {
    expect(parseCandidate(raw('123', 'x', 'y', 1, 'l'))).toBeNull();
    const c = parseCandidate(raw('4006381333931', 'Lait', 'Milbona', 1, 'l'))!;
    expect(packMatches(lait.pack, c)).toBe(true);
    expect(packMatches(lait.pack, { ...c, quantity: 50, quantityUnit: 'cl' })).toBe(false);
    expect(packMatches(lait.pack, { ...c, quantity: 1000, quantityUnit: 'g' })).toBe(false);
  });

  it('classe les candidats par nom, marque, format puis popularité', () => {
    const ranked = rankCandidates(lait, 'lidl', [
      parseCandidate(raw('73513537', 'Lait entier', 'Milbona', 1, 'l', 50))!,
      parseCandidate(raw('4006381333931', 'Lait demi-écrémé UHT', 'Milbona', 1, 'l', 2))!,
      parseCandidate(raw('036000291452', 'Jus d’orange', 'Solevita', 1, 'l', 90))!,
    ]);
    expect(ranked.map((s) => s.candidate.code)).toEqual(['4006381333931', '73513537']);
    expect(ranked[0]).toMatchObject({
      productId: 'lait-demi-ecreme-uht',
      brand: 'Milbona',
      expectedPack: '1 L',
    });
  });

  it('écrit un fichier de relecture et le relit, guillemets compris', () => {
    const [s] = rankCandidates(lait, 'lidl', [
      parseCandidate(raw('4006381333931', 'Lait "demi"; UHT', 'Milbona', 1, 'l'))!,
    ]);
    const rows = parseCsv(toCsv([s!]));
    expect(rows[0]).toMatchObject({
      fiche: 'lait-demi-ecreme-uht',
      enseigne: 'Lidl',
      ean_propose: '4006381333931',
    });
    expect(rows[0]!.nom_open_food_facts).toBe('Lait "demi"; UHT');
  });

  it('n’applique que les lignes validées, et signale les erreurs', () => {
    const rows = [
      {
        fiche: 'lait-demi-ecreme-uht',
        enseigne: 'Lidl',
        ean_propose: '4006381333931',
        valider: 'oui',
      },
      {
        fiche: 'lait-demi-ecreme-uht',
        enseigne: 'Carrefour',
        ean_propose: '73513537',
        valider: '',
      },
      { fiche: 'inconnue', enseigne: 'Lidl', ean_propose: '4006381333931', valider: 'oui' },
      {
        fiche: 'lait-demi-ecreme-uht',
        enseigne: 'E.Leclerc',
        ean_propose: '73513537',
        valider: 'oui',
      },
      { fiche: 'lait-demi-ecreme-uht', enseigne: 'Carrefour', ean_propose: '1234', valider: 'oui' },
    ];
    const result = applyValidated([lait], rows);
    expect(result.applied).toEqual([
      { productId: 'lait-demi-ecreme-uht', enseigne: 'lidl', ean: '4006381333931' },
    ]);
    expect(result.products[0]!.references[0]!.ean).toBe('4006381333931');
    expect(lait.references[0]!.ean).toBe(''); // l'original n'est pas modifié
    expect(result.errors).toHaveLength(3);
    expect(formatProductsJson(result.products).split('\n')).toHaveLength(4);
  });
});
