import { useMemo } from 'react';
import { compareStores, type Line } from '../services/comparator';
import type { ComparisonMode } from '../types/stores';
import { useCatalog, usePrices, useSettings, useShoppingList } from './useAppContexts';

/** Comparaison de la liste ouverte dans vos magasins (mode des réglages par défaut). */
export function useComparison(mode?: ComparisonMode) {
  const { list } = useShoppingList();
  const { catalog } = useCatalog();
  const { stores, options } = useSettings();
  const { priceAt } = usePrices();
  const lines = useMemo<Line[]>(
    () =>
      list.items.flatMap((item) => {
        const product = catalog.productById.get(item.productId);
        return product ? [{ item, product }] : [];
      }),
    [list.items, catalog],
  );
  const effectiveMode = mode ?? options.mode;
  const comparison = useMemo(
    () => compareStores(lines, stores, priceAt, effectiveMode),
    [lines, stores, priceAt, effectiveMode],
  );
  return { lines, stores, comparison };
}
