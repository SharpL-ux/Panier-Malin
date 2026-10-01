import type { Pack } from './catalog';

/** Ce à quoi un prix se rapporte : un conditionnement, un kilo ou une pièce (prix du vrac). */
export type PricePer = 'pack' | 'kg' | 'piece';
export type PriceSource = 'manuel' | 'open-prices';

/** Un prix observé pour une fiche dans un de vos magasins. */
export interface PriceObservation {
  productId: string;
  storeId: string;
  /** En centimes : prix du conditionnement `pack` (per = 'pack'), ou prix au kilo / à la pièce. */
  cents: number;
  per: PricePer;
  pack?: Pack;
  /** Date du relevé, AAAA-MM-JJ. */
  date: string;
  source: PriceSource;
  /** Relevé fait dans un autre magasin de la même enseigne : son nom, pour le signaler. */
  fallbackFrom?: string;
  openPricesId?: number;
}

export interface SelectedPrice {
  observation: PriceObservation;
  /** Prix emprunté à un autre magasin de la même enseigne. */
  fallback: boolean;
  /** Relevé de plus de trois mois. */
  stale: boolean;
}

/** Prix saisi par l'utilisateur, enregistré sur son appareil. */
export interface ManualPrice {
  cents: number;
  per: PricePer;
  date: string;
}
