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

function stamp(now: Date): string {
  return now.toISOString();
}

function mapItem(
  list: ShoppingList,
  itemId: string,
  fn: (item: ListItem) => ListItem,
  now: Date,
): ShoppingList {
  return touch(
    list,
    list.items.map((i) => (i.id === itemId ? { ...fn(i), updatedAt: stamp(now) } : i)),
    now,
  );
}

/** Renomme la liste ; un nom vide est ignoré. */
export function renameList(list: ShoppingList, name: string, now: Date = new Date()): ShoppingList {
  const clean = name.trim().replace(/\s+/g, ' ');
  return clean && clean !== list.name ? { ...list, name: clean, updatedAt: stamp(now) } : list;
}

export function toggleChecked(
  list: ShoppingList,
  itemId: string,
  now: Date = new Date(),
): ShoppingList {
  return mapItem(list, itemId, (i) => ({ ...i, checked: !i.checked }), now);
}

/** Enregistre la note d'un article ; une note vide la supprime. */
export function setNote(
  list: ShoppingList,
  itemId: string,
  note: string,
  now: Date = new Date(),
): ShoppingList {
  const clean = note.trim();
  return mapItem(
    list,
    itemId,
    (i) => {
      const rest = { ...i };
      delete rest.note;
      return clean ? { ...rest, note: clean } : rest;
    },
    now,
  );
}

export function uncheckAll(list: ShoppingList, now: Date = new Date()): ShoppingList {
  if (!list.items.some((i) => i.checked)) return list;
  return touch(
    list,
    list.items.map((i) => (i.checked ? { ...i, checked: false, updatedAt: stamp(now) } : i)),
    now,
  );
}

/** Ajoute les produits absents de la liste (les favoris, par exemple) sans toucher aux quantités existantes. */
export function addProducts(
  list: ShoppingList,
  products: Product[],
  now: Date = new Date(),
): ShoppingList {
  let next = list;
  for (const product of products)
    if (!findItem(next, product.id)) next = addProduct(next, product, now);
  return next;
}

/** Affecte des articles à des magasins (undefined retire l'affectation). */
export function assignStores(
  list: ShoppingList,
  assignments: Record<string, string | undefined>,
  now: Date = new Date(),
): ShoppingList {
  return touch(
    list,
    list.items.map((i) => {
      if (!(i.id in assignments)) return i;
      const storeId = assignments[i.id];
      const rest = { ...i, updatedAt: stamp(now) };
      delete rest.assignedStoreId;
      return storeId ? { ...rest, assignedStoreId: storeId } : rest;
    }),
    now,
  );
}

export function clearAssignments(list: ShoppingList, now: Date = new Date()): ShoppingList {
  return assignStores(list, Object.fromEntries(list.items.map((i) => [i.id, undefined])), now);
}

/**
 * Reprend une liste pour la semaine de `now` : mêmes articles, quantités et notes,
 * mais rien n'est coché et les affectations aux magasins sont oubliées (les prix changent).
 */
export function duplicateList(source: ShoppingList, now: Date = new Date()): ShoppingList {
  const list = createList(now);
  const items = source.items.map((i) => {
    const copy: ListItem = { ...i, id: createId('article'), checked: false, updatedAt: stamp(now) };
    delete copy.assignedStoreId;
    return copy;
  });
  return { ...list, items };
}

/** Listes de la plus récente à la plus ancienne. */
export function sortLists(lists: ShoppingList[]): ShoppingList[] {
  return [...lists].sort(
    (a, b) => b.weekOf.localeCompare(a.weekOf) || b.updatedAt.localeCompare(a.updatedAt),
  );
}

/** Nom libre parmi les listes existantes : « Semaine du 28/09/2026 (2) » si le nom est déjà pris. */
export function uniqueName(base: string, lists: ShoppingList[]): string {
  const names = new Set(lists.map((l) => l.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} (${n})`)) n += 1;
  return `${base} (${n})`;
}
