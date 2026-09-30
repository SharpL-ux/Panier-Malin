import { describe, expect, it } from 'vitest';
import { BASE_PRODUCTS } from '../services/catalog';
import { checkHalalRules, validateCatalog } from '../services/catalogValidation';
import type { Product } from '../types/catalog';
import { CATEGORIES } from './categories';

describe('catalogue livré (products.json)', () => {
  it('est cohérent : identifiants, formats, références, codes-barres et règles halal', () => {
    expect(validateCatalog(BASE_PRODUCTS)).toEqual([]);
  });

  it('compte environ 180 fiches, au moins 4 par rayon, dans 22 rayons', () => {
    expect(BASE_PRODUCTS.length).toBeGreaterThanOrEqual(170);
    expect(BASE_PRODUCTS.length).toBeLessThanOrEqual(220);
    expect(CATEGORIES).toHaveLength(22);
    for (const category of CATEGORIES) {
      const count = BASE_PRODUCTS.filter((p) => p.categoryId === category.id).length;
      expect(count, category.label).toBeGreaterThanOrEqual(4);
    }
  });

  it('n’a plus de rayon Alcools ni de rayon Halal séparé', () => {
    const ids = CATEGORIES.map((c) => c.id as string);
    expect(ids).not.toContain('alcools');
    expect(ids).not.toContain('halal');
  });

  it('donne une référence Carrefour, Lidl et E.Leclerc pour une bonne part des fiches', () => {
    for (const enseigne of ['carrefour', 'lidl', 'leclerc'] as const) {
      const count = BASE_PRODUCTS.filter((p) =>
        p.references.some((r) => r.enseigne === enseigne),
      ).length;
      expect(count, enseigne).toBeGreaterThan(60);
    }
  });

  it('ne garde qu’une marque par enseigne et fiche', () => {
    for (const p of BASE_PRODUCTS) {
      const enseignes = p.references.map((r) => r.enseigne);
      expect(new Set(enseignes).size, p.id).toBe(enseignes.length);
    }
  });

  it('ne contient que de la viande et de la volaille certifiées halal', () => {
    const meats = BASE_PRODUCTS.filter(
      (p) => p.categoryId === 'boucherie' || p.categoryId === 'volaille',
    );
    expect(meats.length).toBeGreaterThan(10);
    expect(meats.every((p) => p.halal)).toBe(true);
  });
});

describe('validateCatalog', () => {
  const lait: Product = {
    id: 'lait-test',
    name: 'Lait demi-écrémé',
    categoryId: 'cremerie',
    icon: '🥛',
    pack: { count: 1, size: 1000, unit: 'ml' },
    soldByWeight: false,
    halal: false,
    references: [{ enseigne: 'lidl', brand: 'Milbona', ean: '' }],
  };

  it('accepte une fiche correcte', () => {
    expect(validateCatalog([lait])).toEqual([]);
  });

  it('refuse un code-barres dont la clé de contrôle est fausse', () => {
    const errors = validateCatalog([
      { ...lait, references: [{ enseigne: 'lidl', brand: 'Milbona', ean: '4006381333932' }] },
    ]);
    expect(errors.join()).toMatch(/code-barres invalide/);
  });

  it('refuse deux références avec le même code-barres', () => {
    const ref = { enseigne: 'lidl' as const, brand: 'Milbona', ean: '4006381333931' };
    const errors = validateCatalog([
      { ...lait, references: [ref] },
      { ...lait, id: 'lait-2', references: [ref] },
    ]);
    expect(errors.join()).toMatch(/déjà utilisé/);
  });

  it('refuse deux marques pour une même enseigne', () => {
    const errors = validateCatalog([
      { ...lait, references: [...lait.references, { enseigne: 'lidl', brand: 'Autre', ean: '' }] },
    ]);
    expect(errors.join()).toMatch(/une seule référence par enseigne/);
  });

  it('refuse un format de référence incomparable avec la fiche', () => {
    const errors = validateCatalog([
      {
        ...lait,
        references: [
          { enseigne: 'lidl', brand: 'Milbona', ean: '', pack: { count: 1, size: 500, unit: 'g' } },
        ],
      },
    ]);
    expect(errors.join()).toMatch(/incomparable/);
  });

  it('réserve marque et code-barres de fiche aux produits personnalisés', () => {
    expect(validateCatalog([{ ...lait, brand: 'Lactel' }]).join()).toMatch(
      /réservés aux produits personnalisés/,
    );
  });
});

describe('règles halal du catalogue', () => {
  const base: Product = {
    id: 'x',
    name: 'x',
    categoryId: 'charcuterie-traiteur',
    icon: '🥓',
    pack: { count: 1, size: 200, unit: 'g' },
    soldByWeight: false,
    halal: false,
    references: [],
  };
  const check = (patch: Partial<Product>) => checkHalalRules({ ...base, ...patch });

  it('refuse le porc et ses dérivés', () => {
    expect(check({ name: 'Côtes de porc' })).toHaveLength(1);
    expect(check({ name: 'Lardons fumés' })).toHaveLength(1);
    expect(check({ name: 'Rillettes du Mans' })).toHaveLength(1);
    expect(check({ name: 'Bonbons à la gélatine' })).toHaveLength(1);
  });

  it('refuse les boissons alcoolisées', () => {
    for (const name of ['Bière blonde', 'Vin rouge', 'Whisky', 'Pastis', 'Cidre brut']) {
      expect(check({ name, categoryId: 'boissons' }), name).toHaveLength(1);
    }
  });

  it('n’accepte jambon et saucisson que certifiés halal', () => {
    expect(check({ name: 'Jambon de dinde' })).toHaveLength(2); // non certifié, et viande non halal
    expect(check({ name: 'Jambon de dinde halal', halal: true })).toEqual([]);
  });

  it('exige la certification halal pour toute viande ou volaille', () => {
    expect(check({ name: 'Escalopes de poulet', categoryId: 'volaille' }).join()).toMatch(
      /non certifiée halal/,
    );
    expect(check({ name: 'Steaks hachés', categoryId: 'surgeles' }).join()).toMatch(
      /non certifiée halal/,
    );
    expect(
      check({ name: 'Escalopes de poulet halal', categoryId: 'volaille', halal: true }),
    ).toEqual([]);
  });

  it('ne confond pas les mots proches', () => {
    expect(check({ name: 'Vinaigrette' })).toEqual([]);
    expect(check({ name: 'Croquettes pour chat au poulet', categoryId: 'animaux' })).toEqual([]);
    expect(check({ name: 'Bouillon de légumes' })).toEqual([]);
  });
});
