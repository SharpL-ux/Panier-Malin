import { ENSEIGNES } from '../data/enseignes';
import type { EnseigneId } from '../types/catalog';
import type { ComparatorOptions, Store, StoresState } from '../types/stores';
import { normalizeText } from '../utils/text';

export const MAX_STORES = 10;

export const DEFAULT_OPTIONS: ComparatorOptions = {
  mode: 'complet',
  sameEnseigneFallback: true,
  maxStores: 2,
  minSavingCents: 300,
};

/** Reconnaît l'enseigne dans un nom ou une marque OpenStreetMap (« Carrefour Market » → carrefour). */
export function enseigneFromText(...texts: (string | null | undefined)[]): EnseigneId | null {
  const haystack = normalizeText(texts.filter(Boolean).join(' '));
  for (const enseigne of ENSEIGNES) {
    if (enseigne.osmPatterns.some((pattern) => haystack.includes(normalizeText(pattern))))
      return enseigne.id;
  }
  return null;
}

/** « Lidl, Courbevoie » : assez court pour une étiquette, assez précis pour distinguer deux magasins. */
export function storeLabel(store: Store): string {
  return store.city ? `${store.name}, ${store.city}` : store.name;
}

/** Ajoute un magasin (sans doublon, dans la limite de MAX_STORES). Le premier devient le magasin principal. */
export function addStore(state: StoresState, store: Store): StoresState {
  if (state.stores.some((s) => s.id === store.id) || state.stores.length >= MAX_STORES)
    return state;
  return { stores: [...state.stores, store], mainStoreId: state.mainStoreId ?? store.id };
}

export function removeStore(state: StoresState, storeId: string): StoresState {
  const stores = state.stores.filter((s) => s.id !== storeId);
  const mainStoreId = state.mainStoreId === storeId ? stores[0]?.id : state.mainStoreId;
  return mainStoreId ? { stores, mainStoreId } : { stores };
}

export function setMainStore(state: StoresState, storeId: string): StoresState {
  return state.stores.some((s) => s.id === storeId) ? { ...state, mainStoreId: storeId } : state;
}
