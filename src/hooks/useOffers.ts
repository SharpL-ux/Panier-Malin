import { useCallback } from 'react';
import { bestOffer, type Offer } from '../services/pricing';
import type { Product } from '../types/catalog';
import { usePrices, useSettings } from './useAppContexts';

/**
 * Offre la moins chère pour une fiche, dans les magasins de l'enseigne choisie en haut de
 * l'écran (ou dans tous vos magasins).
 */
export function useOffers(): {
  offerFor: (product: Product, quantity?: number) => Offer | null;
  storeIds: string[];
} {
  const { stores, enseigne } = useSettings();
  const { priceAt } = usePrices();
  const storeIds = stores
    .filter((s) => enseigne === 'all' || s.enseigne === enseigne)
    .map((s) => s.id);
  const key = storeIds.join(',');
  const offerFor = useCallback(
    (product: Product, quantity = 1) =>
      bestOffer(product, quantity, key ? key.split(',') : [], priceAt),
    [key, priceAt],
  );
  return { offerFor, storeIds };
}
