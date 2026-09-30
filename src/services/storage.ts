import { MIGRATIONS } from './migrations';

/**
 * Persistance locale versionnée. Chaque valeur est enveloppée avec un numéro de schéma
 * pour pouvoir migrer les données des utilisateurs quand le modèle évolue.
 * Toute erreur (quota dépassé, navigation privée, JSON corrompu) est absorbée :
 * l'application continue de fonctionner, sans persistance.
 */

export const STORAGE_PREFIX = 'panier-malin:';
export const SCHEMA_VERSION = 2;

interface Envelope<T> {
  v: number;
  data: T;
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readValue<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as Envelope<unknown>;
    if (typeof parsed !== 'object' || parsed === null || !('v' in parsed)) return fallback;
    let { v, data } = parsed;
    while (v < SCHEMA_VERSION) {
      const migrate = MIGRATIONS[key]?.[v];
      data = migrate ? migrate(data) : data;
      v += 1;
    }
    return data as T;
  } catch {
    return fallback;
  }
}

export function writeValue<T>(key: string, data: T): boolean {
  const store = storage();
  if (!store) return false;
  try {
    const envelope: Envelope<T> = { v: SCHEMA_VERSION, data };
    store.setItem(STORAGE_PREFIX + key, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function removeValue(key: string): void {
  try {
    storage()?.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* rien à faire */
  }
}
