import { describe, expect, it } from 'vitest';
import { BASE_GROUPS, BASE_PRODUCTS } from '../services/catalog';
import { validateCatalog } from '../services/catalogValidation';
import type { Product } from '../types/catalog';
import { CATEGORIES } from './categories';

describe('catalogue livré (products.json)', () => {
  it('est cohérent : identifiants, groupes, unités, codes-barres', () => {
    expect(validateCatalog(BASE_PRODUCTS, BASE_GROUPS)).toEqual([]);
  });

  it('compte au moins 400 produits répartis sur les 24 catégories', () => {
    expect(BASE_PRODUCTS.length).toBeGreaterThanOrEqual(400);
    expect(CATEGORIES).toHaveLength(24);
    for (const category of CATEGORIES) {
      const count = BASE_PRODUCTS.filter((p) => p.categoryId === category.id).length;
      expect(count, category.label).toBeGreaterThanOrEqual(5);
    }
  });

  it('contient des marques de distributeur de Carrefour, Lidl et E.Leclerc', () => {
    for (const enseigne of ['carrefour', 'lidl', 'leclerc'] as const) {
      const own = BASE_PRODUCTS.filter(
        (p) => p.brandType === 'distributeur' && p.enseignes.includes(enseigne),
      );
      expect(own.length, enseigne).toBeGreaterThan(50);
    }
  });

  it('propose au moins deux marques dans la plupart des groupes, pour pouvoir comparer', () => {
    const sizes = BASE_GROUPS.map(
      (g) => BASE_PRODUCTS.filter((p) => p.equivalenceGroup === g.id).length,
    );
    const comparable = sizes.filter((n) => n >= 2).length;
    expect(comparable / BASE_GROUPS.length).toBeGreaterThan(0.8);
  });
});

describe('validateCatalog', () => {
  const group = {
    id: 'lait',
    label: 'Lait',
    categoryId: 'cremerie' as const,
    refUnit: 'L' as const,
  };
  const product: Product = {
    id: 'lait-test-1l',
    name: 'Lait',
    brand: 'Test',
    brandType: 'nationale',
    enseignes: [],
    categoryId: 'cremerie',
    icon: '🥛',
    ean: '',
    pack: { count: 1, size: 1000, unit: 'ml' },
    soldByWeight: false,
    equivalenceGroup: 'lait',
    flags: { bio: false, halal: false },
  };

  it('accepte un produit correct', () => {
    expect(validateCatalog([product], [group])).toEqual([]);
  });

  it('refuse un code-barres dont la clé de contrôle est fausse', () => {
    const errors = validateCatalog([{ ...product, ean: '4006381333932' }], [group]);
    expect(errors.join()).toMatch(/code-barres invalide/);
  });

  it('refuse deux produits avec le même code-barres', () => {
    const a = { ...product, ean: '4006381333931' };
    const b = { ...product, id: 'lait-test-2', ean: '4006381333931' };
    expect(validateCatalog([a, b], [group]).join()).toMatch(/déjà utilisé/);
  });

  it('refuse un format incompatible avec l’unité du groupe', () => {
    const errors = validateCatalog(
      [{ ...product, pack: { count: 1, size: 500, unit: 'g' } }],
      [group],
    );
    expect(errors.join()).toMatch(/incompatible/);
  });

  it('exige une enseigne pour une marque de distributeur', () => {
    const errors = validateCatalog([{ ...product, brandType: 'distributeur' }], [group]);
    expect(errors.join()).toMatch(/doit indiquer son enseigne/);
  });

  it('signale un groupe inconnu ou vide', () => {
    expect(validateCatalog([{ ...product, equivalenceGroup: 'autre' }], [group]).join()).toMatch(
      /inconnu/,
    );
    expect(validateCatalog([], [group]).join()).toMatch(/aucun produit/);
  });
});
