import { useCallback, useMemo, type ReactNode } from 'react';
import { ShoppingListContext } from '../../hooks/contexts';
import { usePersistentState } from '../../hooks/usePersistentState';
import * as lists from '../../services/shoppingList';
import type { Product } from '../../types/catalog';
import type { ShoppingList } from '../../types/list';

interface ListsState {
  lists: ShoppingList[];
  currentId: string;
}

function initialLists(): ListsState {
  const list = lists.createList();
  return { lists: [list], currentId: list.id };
}

export function ShoppingListProvider({ children }: { children: ReactNode }) {
  const [state, setState] = usePersistentState<ListsState>('listes', initialLists);
  const sorted = useMemo(() => lists.sortLists(state.lists), [state.lists]);
  const list = state.lists.find((l) => l.id === state.currentId) ?? sorted[0] ?? lists.createList();

  const update = useCallback(
    (fn: (list: ShoppingList) => ShoppingList) =>
      setState((s) => ({ ...s, lists: s.lists.map((l) => (l.id === s.currentId ? fn(l) : l)) })),
    [setState],
  );

  const startNewList = useCallback(
    (fromListId?: string) =>
      setState((s) => {
        const source = fromListId ? s.lists.find((l) => l.id === fromListId) : undefined;
        const fresh = source ? lists.duplicateList(source) : lists.createList();
        const named = { ...fresh, name: lists.uniqueName(fresh.name, s.lists) };
        return { lists: [...s.lists, named], currentId: named.id };
      }),
    [setState],
  );

  const deleteList = useCallback(
    (listId: string) =>
      setState((s) => {
        const remaining = s.lists.filter((l) => l.id !== listId);
        if (remaining.length === 0) return initialLists();
        const currentId = s.currentId === listId ? lists.sortLists(remaining)[0]!.id : s.currentId;
        return { lists: remaining, currentId };
      }),
    [setState],
  );

  const value = useMemo(
    () => ({
      list,
      lists: sorted,
      selectList: (listId: string) => setState((s) => ({ ...s, currentId: listId })),
      startNewList,
      deleteList,
      renameList: (name: string) => update((l) => lists.renameList(l, name)),
      addProduct: (product: Product) => update((l) => lists.addProduct(l, product)),
      addProducts: (products: Product[]) => update((l) => lists.addProducts(l, products)),
      changeQuantity: (itemId: string, steps: number) =>
        update((l) => lists.changeQuantity(l, itemId, steps)),
      removeItem: (itemId: string) => update((l) => lists.removeItem(l, itemId)),
      toggleChecked: (itemId: string) => update((l) => lists.toggleChecked(l, itemId)),
      setNote: (itemId: string, note: string) => update((l) => lists.setNote(l, itemId, note)),
      uncheckAll: () => update((l) => lists.uncheckAll(l)),
      assignStores: (assignments: Record<string, string | undefined>) =>
        update((l) => lists.assignStores(l, assignments)),
      clearAssignments: () => update((l) => lists.clearAssignments(l)),
    }),
    [list, sorted, setState, startNewList, deleteList, update],
  );

  return <ShoppingListContext.Provider value={value}>{children}</ShoppingListContext.Provider>;
}
