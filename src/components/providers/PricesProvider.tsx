import { useQuery } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { PricesContext, type PricesStatus } from '../../hooks/contexts';
import { useCatalog, useSettings } from '../../hooks/useAppContexts';
import { usePersistentState } from '../../hooks/usePersistentState';
import {
  createOpenPricesProvider,
  manualObservations,
  priceTargets,
} from '../../services/priceProviders';
import { indexObservations, priceKey, selectPrice } from '../../services/pricing';
import type { ManualPrice, SelectedPrice } from '../../types/prices';
import { hashString } from '../../utils/hash';

export const DAY_MS = 24 * 60 * 60 * 1000;
const openPrices = createOpenPricesProvider();

/**
 * Réunit les prix Open Prices (mis en cache 24 h, y compris d'une visite à l'autre) et vos
 * saisies, puis applique les règles de choix du prix pour chaque fiche et chaque magasin.
 */
export function PricesProvider({ children }: { children: ReactNode }) {
  const { stores, options } = useSettings();
  const { catalog } = useCatalog();
  const [manual, setManual] = usePersistentState<Record<string, ManualPrice>>(
    'prix:manuels',
    () => ({}),
  );

  const located = useMemo(() => stores.filter((s) => s.locationId !== undefined), [stores]);
  const signature = useMemo(() => {
    const { byCode, byTag } = priceTargets(catalog.products, located);
    return {
      count: byCode.size + byTag.size,
      hash: hashString([...byCode.keys(), ...byTag.keys()].sort().join(',')),
    };
  }, [catalog.products, located]);

  const query = useQuery({
    queryKey: [
      'prix-open-prices',
      located.map((s) => s.locationId!).sort((a, b) => a - b),
      options.sameEnseigneFallback,
      signature.hash,
    ],
    queryFn: ({ signal }) =>
      openPrices.getObservations(
        {
          products: catalog.products,
          stores: located,
          sameEnseigneFallback: options.sameEnseigneFallback,
        },
        signal,
      ),
    enabled: located.length > 0 && signature.count > 0,
    staleTime: DAY_MS,
    gcTime: 2 * DAY_MS,
  });

  const selected = useMemo(() => {
    const today = new Date();
    const index = indexObservations([
      ...(query.data ?? []),
      ...manualObservations(manual, catalog.products, stores),
    ]);
    const map = new Map<string, SelectedPrice>();
    for (const [key, candidates] of index) {
      const choice = selectPrice(candidates, {
        today,
        allowFallback: options.sameEnseigneFallback,
      });
      if (choice) map.set(key, choice);
    }
    return map;
  }, [query.data, manual, catalog.products, stores, options.sameEnseigneFallback]);

  const status: PricesStatus =
    stores.length === 0
      ? 'sans-magasin'
      : query.isLoading
        ? 'chargement'
        : query.isError
          ? 'erreur'
          : 'pret';
  const { refetch, error, dataUpdatedAt } = query;

  const value = useMemo(
    () => ({
      status,
      error: error instanceof Error ? error.message : undefined,
      updatedAt: dataUpdatedAt || undefined,
      refresh: () => void refetch(),
      priceAt: (productId: string, storeId: string) =>
        selected.get(priceKey(productId, storeId)) ?? null,
      manualPrice: (productId: string, storeId: string) => manual[priceKey(productId, storeId)],
      setManualPrice: (productId: string, storeId: string, price: ManualPrice) =>
        setManual((m) => ({ ...m, [priceKey(productId, storeId)]: price })),
      removeManualPrice: (productId: string, storeId: string) =>
        setManual((m) => {
          const next = { ...m };
          delete next[priceKey(productId, storeId)];
          return next;
        }),
    }),
    [status, error, dataUpdatedAt, refetch, selected, manual, setManual],
  );

  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>;
}
