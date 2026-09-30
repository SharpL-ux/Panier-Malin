import { describe, expect, it } from 'vitest';
import type { Product } from '../types/catalog';
import { addProduct, changeQuantity, createList, findItem, removeItem } from './shoppingList';

const now = new Date(2026, 8, 30, 10, 0);
const lait: Product = {
  id: 'lait-demi-ecreme-uht',
  name: 'Lait demi-écrémé UHT',
  categoryId: 'cremerie',
  icon: '🥛',
  pack: { count: 1, size: 1000, unit: 'ml' },
  soldByWeight: false,
  halal: false,
  references: [],
};
const bananes: Product = {
  ...lait,
  id: 'bananes',
  categoryId: 'fruits',
  soldByWeight: true,
  pack: { count: 1, size: 1000, unit: 'g' },
};

describe('liste de courses', () => {
  it('crée la liste de la semaine en cours', () => {
    const list = createList(now);
    expect(list.name).toBe('Semaine du 28/09/2026');
    expect(list.weekOf).toBe('2026-09-28');
    expect(list.items).toEqual([]);
  });

  it('ajoute une fiche puis augmente sa quantité au lieu de la dupliquer', () => {
    let list = addProduct(createList(now), lait, now);
    list = addProduct(list, lait, now);
    expect(list.items).toHaveLength(1);
    expect(findItem(list, lait.id)).toMatchObject({ quantity: 2, step: 1, categoryId: 'cremerie' });
  });

  it('gère les produits au poids par pas de 500 g', () => {
    let list = addProduct(createList(now), bananes, now);
    const item = findItem(list, 'bananes')!;
    expect(item).toMatchObject({ quantity: 1, step: 0.5 });
    list = changeQuantity(list, item.id, 1, now);
    list = changeQuantity(list, item.id, 1, now);
    expect(findItem(list, 'bananes')?.quantity).toBe(2);
  });

  it('retire l’article quand la quantité tombe à zéro', () => {
    let list = addProduct(createList(now), lait, now);
    list = changeQuantity(list, list.items[0]!.id, -1, now);
    expect(list.items).toEqual([]);
  });

  it('supprime un article sans toucher aux autres', () => {
    let list = addProduct(createList(now), lait, now);
    list = addProduct(list, bananes, now);
    list = removeItem(list, list.items[0]!.id, now);
    expect(list.items.map((i) => i.productId)).toEqual(['bananes']);
  });

  it('date chaque modification', () => {
    const later = new Date(2026, 8, 30, 18, 0);
    const list = addProduct(createList(now), lait, later);
    expect(list.updatedAt).toBe(later.toISOString());
  });
});
