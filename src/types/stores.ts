import type { EnseigneId } from './catalog';

/** Un magasin précis choisi par l'utilisateur (le Lidl de son quartier, pas « Lidl » en général). */
export interface Store {
  /** "op-123" pour un magasin Open Prices, "perso-…" pour un magasin saisi à la main. */
  id: string;
  name: string;
  /** Enseigne reconnue à partir du nom ou de la marque OpenStreetMap ; null si inconnue. */
  enseigne: EnseigneId | null;
  address: string;
  city: string;
  /** Identifiant du magasin dans Open Prices. */
  locationId?: number;
  lat?: number;
  lon?: number;
  /** Nombre de prix déjà relevés dans ce magasin sur Open Prices. */
  priceCount?: number;
}

export interface StoresState {
  stores: Store[];
  /** Magasin habituel : il reçoit les articles sans prix et départage les égalités. */
  mainStoreId?: string;
}

/** Articles communs : seulement les articles dont le prix est connu partout. Estimation complète : tout ce qui est connu. */
export type ComparisonMode = 'communs' | 'complet';

export interface ComparatorOptions {
  mode: ComparisonMode;
  /** Utiliser le relevé d'un autre magasin de la même enseigne quand le vôtre n'en a pas (signalé). */
  sameEnseigneFallback: boolean;
  /** Nombre maximal de magasins du panier optimal. */
  maxStores: 1 | 2 | 3;
  /** Économie minimale (centimes) pour qu'un magasin de plus vaille le déplacement. */
  minSavingCents: number;
}
