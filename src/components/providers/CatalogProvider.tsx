import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { CatalogContext } from '../../hooks/contexts';
import { usePersistentState } from '../../hooks/usePersistentState';
import { buildCatalog } from '../../services/catalog';
import { OBSOLETE_KEYS } from '../../services/migrations';
import { removeValue } from '../../services/storage';
import type { Product } from '../../types/catalog';

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [customProducts, setCustomProducts] = usePersistentState<Product[]>(
    'catalogue:produits-perso',
    () => [],
  );
  const [favoriteIds, setFavoriteIds] = usePersistentState<string[]>('favoris', () => []);

  useEffect(() => {
    for (const key of OBSOLETE_KEYS) removeValue(key);
  }, []);

  const catalog = useMemo(() => buildCatalog(customProducts), [customProducts]);
  const addCustomProduct = useCallback(
    (product: Product) =>
      setCustomProducts((current) => [...current, { ...product, custom: true }]),
    [setCustomProducts],
  );
  const toggleFavorite = useCallback(
    (productId: string) =>
      setFavoriteIds((ids) =>
        ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId],
      ),
    [setFavoriteIds],
  );
  const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const value = useMemo(
    () => ({ catalog, addCustomProduct, favorites, toggleFavorite }),
    [catalog, addCustomProduct, favorites, toggleFavorite],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
