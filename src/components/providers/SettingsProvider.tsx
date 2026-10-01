import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { SettingsContext, type EnseigneChoice, type Theme } from '../../hooks/contexts';
import { usePersistentState } from '../../hooks/usePersistentState';
import * as storesLogic from '../../services/stores';
import type { ComparatorOptions, Store, StoresState } from '../../types/stores';

/** Thème initial : réglage imposé par la page hôte (data-theme) s'il existe, sinon préférence du système. */
function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const forced = document.documentElement.dataset.theme;
  if (forced === 'dark' || forced === 'light') return forced;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePersistentState<Theme>('theme', initialTheme);
  const [enseigne, setEnseigne] = usePersistentState<EnseigneChoice>('enseigne', () => 'all');
  const [storesState, setStoresState] = usePersistentState<StoresState>('magasins', () => ({
    stores: [],
  }));
  const [options, setOptionsState] = usePersistentState<ComparatorOptions>(
    'reglages:comparateur',
    () => ({
      ...storesLogic.DEFAULT_OPTIONS,
    }),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const addStore = useCallback(
    (store: Store) => {
      const canAdd =
        !storesState.stores.some((s) => s.id === store.id) &&
        storesState.stores.length < storesLogic.MAX_STORES;
      if (canAdd) setStoresState((s) => storesLogic.addStore(s, store));
      return canAdd;
    },
    [storesState, setStoresState],
  );

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      enseigne,
      setEnseigne,
      stores: storesState.stores,
      mainStoreId: storesState.mainStoreId,
      addStore,
      removeStore: (id: string) => setStoresState((s) => storesLogic.removeStore(s, id)),
      setMainStore: (id: string) => setStoresState((s) => storesLogic.setMainStore(s, id)),
      options: { ...storesLogic.DEFAULT_OPTIONS, ...options },
      setOptions: (patch: Partial<ComparatorOptions>) =>
        setOptionsState((o) => ({ ...o, ...patch })),
    }),
    [
      theme,
      setTheme,
      enseigne,
      setEnseigne,
      storesState,
      setStoresState,
      addStore,
      options,
      setOptionsState,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
