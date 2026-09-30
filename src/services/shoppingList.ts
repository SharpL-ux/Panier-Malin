import type { EquivalenceGroup, Product } from '../types/catalog';
import type { ListItem, ShoppingList } from '../types/list';
import { defaultListName, mondayOf } from '../utils/dates';
import { createId } from '../utils/ids';
import { refQuantity, round3 } from '../utils/units';

/** Pas du sélecteur de quantité pour les produits vendus au poids (en kg). */
export const WEIGHT_STEP_KG = 0.5;

export function createList(now: Date = new Date()): ShoppingList {
  const weekOf = mondayOf(now);
  const stamp = now.toISOString();
  return {
    id: createId('liste'),
    name: defaultListName(weekOf),
    weekOf,
    items: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function touch(list: ShoppingList, items: ListItem[], now: Date): ShoppingList {
  return { ...list, items, updatedAt: now.toISOString() };
}

export function findProductItem(list: ShoppingList, productId: string): ListItem | undefined {
  return list.items.find((i) => i.target.kind === 'produit' && i.target.productId === productId);
}

export function findGenericItem(list: ShoppingList, groupId: string): ListItem | undefined {
  return list.items.find((i) => i.target.kind === 'generique' && i.target.groupId === groupId);
}

/** Ajoute un produit précis, ou augmente sa quantité s'il est déjà dans la liste. */
export function addProduct(
  list: ShoppingList,
  product: Product,
  now: Date = new Date(),
): ShoppingList {
  const step = product.soldByWeight ? WEIGHT_STEP_KG : 1;
  const existing = findProductItem(list, product.id);
  if (existing) return changeQuantity(list, existing.id, 1, now);
  const item: ListItem = {
    id: createId('article'),
    target: { kind: 'produit', productId: product.id },
    quantity: 1,
    step,
    categoryId: product.categoryId,
    checked: false,
    updatedAt: now.toISOString(),
  };
  return touch(list, [...list.items, item], now);
}

/**
 * Ajoute « n'importe quel produit » du groupe. Le besoin est exprimé dans l'unité de
 * référence du groupe, avec pour pas le format du produit d'origine (1 L de lait, 500 g de pâtes).
 */
export function addGeneric(
  list: ShoppingList,
  group: EquivalenceGroup,
  fromProduct: Product,
  now: Date = new Date(),
): ShoppingList {
  const existing = findGenericItem(list, group.id);
  if (existing) return changeQuantity(list, existing.id, 1, now);
  const step = fromProduct.soldByWeight ? WEIGHT_STEP_KG : refQuantity(fromProduct.pack);
  const item: ListItem = {
    id: createId('article'),
    target: { kind: 'generique', groupId: group.id },
    quantity: fromProduct.soldByWeight ? 1 : step,
    step,
    categoryId: group.categoryId,
    checked: false,
    updatedAt: now.toISOString(),
  };
  return touch(list, [...list.items, item], now);
}

/** Ajoute ou retire `steps` pas. Une quantité qui tombe à zéro retire l'article. */
export function changeQuantity(
  list: ShoppingList,
  itemId: string,
  steps: number,
  now: Date = new Date(),
): ShoppingList {
  const items: ListItem[] = [];
  for (const item of list.items) {
    if (item.id !== itemId) {
      items.push(item);
      continue;
    }
    const quantity = round3(item.quantity + steps * item.step);
    if (quantity > 0) items.push({ ...item, quantity, updatedAt: now.toISOString() });
  }
  return touch(list, items, now);
}

export function removeItem(
  list: ShoppingList,
  itemId: string,
  now: Date = new Date(),
): ShoppingList {
  return touch(
    list,
    list.items.filter((i) => i.id !== itemId),
    now,
  );
}

export function countItems(list: ShoppingList): number {
  return list.items.length;
}
