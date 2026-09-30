import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import {
  CatalogContext,
  SettingsContext,
  ShoppingListContext,
  type EnseigneChoice,
  type Theme,
} from '../../hooks/contexts';
import { buildCatalog } from '../../services/catalog';
import * as lists from '../../services/shoppingList';
import type { EquivalenceGroup, Product } from '../../types/catalog';
import type { ShoppingList } from '../../types/list';

/** Thème initial : réglage imposé par la page hôte (data-theme) s'il existe, sinon préférence du système. */
function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const forced = document.documentElement.dataset.theme;
  if (forced === 'dark' || forced === 'light') return forced;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface ListsState {
  lists: ShoppingList[];
  currentId: string;
}

function initialLists(): ListsState {
  const list = lists.createList();
  return { lists: [list], currentId: list.id };
}

export function AppProviders({ children }: { children: ReactNode }) {
  // ---- Préférences
  const [theme, setTheme] = usePersistentState<Theme>('theme', initialTheme);
  const [enseigne, setEnseigne] = usePersistentState<EnseigneChoice>('enseigne', () => 'all');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const settings = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      enseigne,
      setEnseigne,
    }),
    [theme, setTheme, enseigne, setEnseigne],
  );

  // ---- Catalogue (base + produits personnalisés)
  const [customProducts, setCustomProducts] = usePersistentState<Product[]>(
    'catalogue:produits-perso',
    () => [],
  );
  const [customGroups, setCustomGroups] = usePersistentState<EquivalenceGroup[]>(
    'catalogue:groupes-perso',
    () => [],
  );
  const catalog = useMemo(
    () => buildCatalog(customProducts, customGroups),
    [customProducts, customGroups],
  );
  const addCustomProduct = useCallback(
    (product: Product, group?: EquivalenceGroup) => {
      setCustomProducts((current) => [...current, { ...product, custom: true }]);
      if (group) setCustomGroups((current) => [...current, group]);
    },
    [setCustomProducts, setCustomGroups],
  );
  const catalogValue = useMemo(() => ({ catalog, addCustomProduct }), [catalog, addCustomProduct]);

  // ---- Liste de courses
  const [state, setState] = usePersistentState<ListsState>('listes', initialLists);
  const list =
    state.lists.find((l) => l.id === state.currentId) ?? state.lists[0] ?? lists.createList();

  const update = useCallback(
    (fn: (list: ShoppingList) => ShoppingList) =>
      setState((s) => ({ ...s, lists: s.lists.map((l) => (l.id === s.currentId ? fn(l) : l)) })),
    [setState],
  );

  const listValue = useMemo(
    () => ({
      list,
      addProduct: (product: Product) => update((l) => lists.addProduct(l, product)),
      addGeneric: (product: Product) => {
        const group = catalog.groupById.get(product.equivalenceGroup);
        if (group) update((l) => lists.addGeneric(l, group, product));
      },
      changeQuantity: (itemId: string, steps: number) =>
        update((l) => lists.changeQuantity(l, itemId, steps)),
      removeItem: (itemId: string) => update((l) => lists.removeItem(l, itemId)),
    }),
    [list, update, catalog],
  );

  return (
    <SettingsContext.Provider value={settings}>
      <CatalogContext.Provider value={catalogValue}>
        <ShoppingListContext.Provider value={listValue}>{children}</ShoppingListContext.Provider>
      </CatalogContext.Provider>
    </SettingsContext.Provider>
  );
}
