import { readValue, SCHEMA_VERSION, writeValue } from './storage';

/**
 * Préparation de la synchronisation entre appareils (Supabase, prévue juste après la V1).
 * L'application reste « local d'abord » : tout est sur l'appareil, et un adaptateur distant
 * n'aura qu'à implémenter SyncAdapter pour envoyer et recevoir un instantané des données.
 */
export const SYNCED_KEYS = [
  'listes',
  'favoris',
  'magasins',
  'prix:manuels',
  'catalogue:produits-perso',
  'reglages:comparateur',
  'reglages:pdf',
  'enseigne',
  'theme',
] as const;
export type SyncedKey = (typeof SYNCED_KEYS)[number];

export interface Snapshot {
  app: 'panier-malin';
  schemaVersion: number;
  exportedAt: string;
  data: Partial<Record<SyncedKey, unknown>>;
}

export interface SyncAdapter {
  readonly name: string;
  /** Dernier instantané connu de la source, ou null s'il n'y en a pas. */
  pull: () => Promise<Snapshot | null>;
  /** Enregistre l'instantané dans la source. */
  push: (snapshot: Snapshot) => Promise<void>;
}

const ABSENT = Symbol('absent');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function takeSnapshot(now: Date = new Date()): Snapshot {
  const data: Partial<Record<SyncedKey, unknown>> = {};
  for (const key of SYNCED_KEYS) {
    const value = readValue<unknown>(key, ABSENT);
    if (value !== ABSENT) data[key] = value;
  }
  return {
    app: 'panier-malin',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
}

/** Lit une sauvegarde ; null si ce n'est pas une sauvegarde Panier malin de la version actuelle. */
export function parseSnapshot(text: string): Snapshot | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (
    !isRecord(raw) ||
    raw.app !== 'panier-malin' ||
    raw.schemaVersion !== SCHEMA_VERSION ||
    !isRecord(raw.data)
  ) {
    return null;
  }
  const source = raw.data;
  const data: Partial<Record<SyncedKey, unknown>> = {};
  for (const key of SYNCED_KEYS) if (key in source) data[key] = source[key];
  return {
    app: 'panier-malin',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: String(raw.exportedAt ?? ''),
    data,
  };
}

/** Écrit l'instantané sur l'appareil ; renvoie le nombre d'éléments restaurés. */
export function restoreSnapshot(snapshot: Snapshot): number {
  let restored = 0;
  for (const key of SYNCED_KEYS) {
    if (key in snapshot.data && writeValue(key, snapshot.data[key])) restored += 1;
  }
  return restored;
}

/** Adaptateur de l'appareil lui-même : sert de référence (et aux tests) avant l'adaptateur Supabase. */
export function createLocalSyncAdapter(): SyncAdapter {
  return {
    name: 'appareil',
    pull: () => Promise.resolve(takeSnapshot()),
    push: (snapshot) => {
      restoreSnapshot(snapshot);
      return Promise.resolve();
    },
  };
}
