import type { Enseigne, EnseigneId } from '../types/catalog';

/**
 * Enseignes gérées. Les logos officiels ne sont pas utilisés (droit des marques) :
 * chaque enseigne est représentée par un badge coloré portant son nom.
 */
export const ENSEIGNES: readonly Enseigne[] = [
  {
    id: 'carrefour',
    label: 'Carrefour',
    badgeBg: '#1d4ed8',
    badgeFg: '#ffffff',
    osmPatterns: ['carrefour'],
  },
  { id: 'lidl', label: 'Lidl', badgeBg: '#ffe14d', badgeFg: '#0a2a66', osmPatterns: ['lidl'] },
  {
    id: 'leclerc',
    label: 'E.Leclerc',
    badgeBg: '#c2410c',
    badgeFg: '#ffffff',
    osmPatterns: ['leclerc'],
  },
  {
    id: 'hmarket',
    label: 'H Market',
    badgeBg: '#6d28d9',
    badgeFg: '#ffffff',
    osmPatterns: ['h market', 'hmarket', 'h-market'],
  },
  {
    id: 'marka',
    label: 'Marka Market',
    badgeBg: '#15803d',
    badgeFg: '#ffffff',
    osmPatterns: ['marka'],
  },
];

const BY_ID = new Map(ENSEIGNES.map((e) => [e.id, e]));

export function getEnseigne(id: EnseigneId): Enseigne {
  const enseigne = BY_ID.get(id);
  if (!enseigne) throw new Error(`Enseigne inconnue : ${id}`);
  return enseigne;
}

export function isEnseigneId(value: string): value is EnseigneId {
  return BY_ID.has(value as EnseigneId);
}
