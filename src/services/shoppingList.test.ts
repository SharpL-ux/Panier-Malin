import { describe, expect, it } from 'vitest';
import type { Product } from '../types/catalog';
import {
  addProduct,
  addProducts,
  assignStores,
  changeQuantity,
  clearAssignments,
  createList,
  duplicateList,
  findItem,
  removeItem,
  renameList,
  setNote,
  sortLists,
  toggleChecked,
  uncheckAll,
  uniqueName,
} from './shoppingList';

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

describe('gestion de la liste (étape 2)', () => {
  const later = new Date(2026, 9, 6, 9, 0); // lundi suivant

  it('renomme la liste, sans accepter un nom vide', () => {
    const list = createList(now);
    expect(renameList(list, '  Courses   du week-end ', now).name).toBe('Courses du week-end');
    expect(renameList(list, '   ', now)).toBe(list);
  });

  it('coche et décoche un article, puis décoche tout', () => {
    let list = addProduct(createList(now), lait, now);
    const id = list.items[0]!.id;
    list = toggleChecked(list, id, now);
    expect(list.items[0]!.checked).toBe(true);
    list = uncheckAll(list, now);
    expect(list.items[0]!.checked).toBe(false);
  });

  it('enregistre une note et la supprime quand elle est vide', () => {
    let list = addProduct(createList(now), bananes, now);
    const id = list.items[0]!.id;
    list = setNote(list, id, '  bien mûres ', now);
    expect(list.items[0]!.note).toBe('bien mûres');
    list = setNote(list, id, '', now);
    expect(list.items[0]).not.toHaveProperty('note');
  });

  it('ajoute les favoris absents sans modifier les quantités existantes', () => {
    let list = addProduct(createList(now), lait, now);
    list = changeQuantity(list, list.items[0]!.id, 2, now);
    list = addProducts(list, [lait, bananes], now);
    expect(list.items.map((i) => [i.productId, i.quantity])).toEqual([
      ['lait-demi-ecreme-uht', 3],
      ['bananes', 1],
    ]);
  });

  it('reprend une liste pour la nouvelle semaine : rien de coché, sans affectation', () => {
    let source = addProduct(createList(now), lait, now);
    const id = source.items[0]!.id;
    source = setNote(
      toggleChecked(assignStores(source, { [id]: 'op-1' }, now), id, now),
      id,
      'demi-écrémé',
      now,
    );
    const copy = duplicateList(source, later);
    expect(copy.weekOf).toBe('2026-10-05');
    expect(copy.name).toBe('Semaine du 05/10/2026');
    expect(copy.items[0]).toMatchObject({
      productId: lait.id,
      quantity: 1,
      checked: false,
      note: 'demi-écrémé',
    });
    expect(copy.items[0]).not.toHaveProperty('assignedStoreId');
    expect(copy.items[0]!.id).not.toBe(id);
  });

  it('affecte des articles à des magasins et efface les affectations', () => {
    let list = addProducts(createList(now), [lait, bananes], now);
    const [a, b] = list.items.map((i) => i.id);
    list = assignStores(list, { [a!]: 'op-1', [b!]: 'op-2' }, now);
    expect(list.items.map((i) => i.assignedStoreId)).toEqual(['op-1', 'op-2']);
    list = assignStores(list, { [a!]: undefined }, now);
    expect(list.items[0]).not.toHaveProperty('assignedStoreId');
    expect(clearAssignments(list, now).items.every((i) => i.assignedStoreId === undefined)).toBe(
      true,
    );
  });

  it('trie l’historique et évite les noms en double', () => {
    const old = createList(now);
    const recent = createList(later);
    expect(sortLists([old, recent]).map((l) => l.weekOf)).toEqual(['2026-10-05', '2026-09-28']);
    expect(uniqueName('Semaine du 28/09/2026', [old])).toBe('Semaine du 28/09/2026 (2)');
    expect(uniqueName('Autre nom', [old])).toBe('Autre nom');
  });
});
