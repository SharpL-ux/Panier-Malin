import { describe, expect, it } from 'vitest';
import type { EquivalenceGroup, Product } from '../types/catalog';
import {
  addGeneric,
  addProduct,
  changeQuantity,
  createList,
  findGenericItem,
  findProductItem,
  removeItem,
} from './shoppingList';

const now = new Date(2026, 8, 30, 10, 0);
const lait: Product = {
  id: 'lait-lactel-1l',
  name: 'Lait demi-écrémé UHT',
  brand: 'Lactel',
  brandType: 'nationale',
  enseignes: [],
  categoryId: 'cremerie',
  icon: '🥛',
  ean: '',
  pack: { count: 1, size: 1000, unit: 'ml' },
  soldByWeight: false,
  equivalenceGroup: 'lait-demi-ecreme',
  flags: { bio: false, halal: false },
};
const pommes: Product = {
  ...lait,
  id: 'pommes',
  categoryId: 'fruits',
  soldByWeight: true,
  pack: { count: 1, size: 1000, unit: 'g' },
};
const groupeLait: EquivalenceGroup = {
  id: 'lait-demi-ecreme',
  label: 'Lait demi-écrémé',
  categoryId: 'cremerie',
  refUnit: 'L',
};

describe('liste de courses', () => {
  it('crée la liste de la semaine en cours', () => {
    const list = createList(now);
    expect(list.name).toBe('Semaine du 28/09/2026');
    expect(list.weekOf).toBe('2026-09-28');
    expect(list.items).toEqual([]);
  });

  it('ajoute un produit précis puis augmente sa quantité', () => {
    let list = addProduct(createList(now), lait, now);
    list = addProduct(list, lait, now);
    expect(list.items).toHaveLength(1);
    expect(findProductItem(list, lait.id)?.quantity).toBe(2);
    expect(findProductItem(list, lait.id)?.categoryId).toBe('cremerie');
  });

  it('gère les produits au poids par pas de 500 g', () => {
    let list = addProduct(createList(now), pommes, now);
    const item = findProductItem(list, 'pommes')!;
    expect(item.quantity).toBe(1);
    list = changeQuantity(list, item.id, 1, now);
    expect(findProductItem(list, 'pommes')?.quantity).toBe(1.5);
  });

  it('ajoute un générique exprimé dans l’unité du groupe, avec le format du produit comme pas', () => {
    const pack6 = { ...lait, pack: { count: 6, size: 1000, unit: 'ml' as const } };
    let list = addGeneric(createList(now), groupeLait, pack6, now);
    expect(findGenericItem(list, 'lait-demi-ecreme')).toMatchObject({
      quantity: 6,
      step: 6,
      target: { kind: 'generique' },
    });
    list = addGeneric(list, groupeLait, pack6, now);
    expect(findGenericItem(list, 'lait-demi-ecreme')?.quantity).toBe(12);
  });

  it('distingue le produit précis et le générique du même groupe', () => {
    let list = addProduct(createList(now), lait, now);
    list = addGeneric(list, groupeLait, lait, now);
    expect(list.items).toHaveLength(2);
  });

  it('retire l’article quand la quantité tombe à zéro', () => {
    let list = addProduct(createList(now), lait, now);
    const id = list.items[0]!.id;
    list = changeQuantity(list, id, -1, now);
    expect(list.items).toEqual([]);
  });

  it('évite les résidus de virgule flottante', () => {
    const canettes = { ...lait, pack: { count: 6, size: 330, unit: 'ml' as const } };
    let list = addGeneric(createList(now), groupeLait, canettes, now);
    const id = list.items[0]!.id;
    list = changeQuantity(list, id, 2, now);
    expect(list.items[0]!.quantity).toBe(5.94);
  });

  it('supprime un article sans toucher aux autres', () => {
    let list = addProduct(createList(now), lait, now);
    list = addProduct(list, pommes, now);
    list = removeItem(list, list.items[0]!.id, now);
    expect(list.items.map((i) => i.target)).toEqual([{ kind: 'produit', productId: 'pommes' }]);
  });
});
