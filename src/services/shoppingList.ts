import type { Product } from '../types/catalog';
import type { ListItem, ShoppingList } from '../types/list';
import { defaultListName, mondayOf } from '../utils/dates';
import { createId } from '../utils/ids';
import { round3 } from '../utils/units';

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

export function findItem(list: ShoppingList, productId: string): ListItem | undefined {
  return list.items.find((i) => i.productId === productId);
}

/** Ajoute une fiche à la liste, ou augmente sa quantité si elle y est déjà. */
export function addProduct(
  list: ShoppingList,
  product: Product,
  now: Date = new Date(),
): ShoppingList {
  const existing = findItem(list, product.id);
  if (existing) return changeQuantity(list, existing.id, 1, now);
  const item: ListItem = {
    id: createId('article'),
    productId: product.id,
    quantity: 1,
    step: product.soldByWeight ? WEIGHT_STEP_KG : 1,
    categoryId: product.categoryId,
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
