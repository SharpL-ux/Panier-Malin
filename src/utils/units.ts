import type { Pack, RefUnit } from '../types/catalog';

const NUMBER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Arrondi à 3 décimales pour neutraliser les résidus flottants (0,5 + 0,25…). */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Unité de référence naturelle d'un conditionnement. */
export function refUnitOf(pack: Pack): RefUnit {
  if (pack.unit === 'g') return 'kg';
  if (pack.unit === 'ml') return 'L';
  return 'piece';
}

/** Vrai si le conditionnement peut s'exprimer dans l'unité de référence demandée. */
export function isPackCompatible(pack: Pack, refUnit: RefUnit): boolean {
  return refUnitOf(pack) === refUnit;
}

/** Quantité totale d'un conditionnement dans son unité de référence (kg, L ou pièces). */
export function refQuantity(pack: Pack): number {
  const total = pack.count * pack.size;
  return pack.unit === 'piece' ? total : round3(total / 1000);
}

function formatSize(size: number, unit: Pack['unit']): string {
  if (unit === 'piece') return size > 1 ? `${size} pièces` : '1 pièce';
  if (unit === 'g') return size >= 1000 ? `${NUMBER.format(size / 1000)} kg` : `${size} g`;
  if (size >= 1000) return `${NUMBER.format(size / 1000)} L`;
  if (size % 10 === 0) return `${size / 10} cl`;
  return `${size} ml`;
}

/** Libellé d'un conditionnement : « 1 L », « 6 × 1 L », « 4 × 125 g », « 12 pièces ». */
export function formatPack(pack: Pack): string {
  const size = formatSize(pack.size, pack.unit);
  return pack.count > 1 ? `${pack.count} × ${size}` : size;
}

export const REF_UNIT_LABEL: Record<RefUnit, string> = { kg: 'kg', L: 'L', piece: 'pièce' };

/** Quantité exprimée dans une unité de référence : « 1,5 kg », « 2 L », « 3 pièces ». */
export function formatRefQuantity(value: number, refUnit: RefUnit): string {
  if (refUnit === 'kg' && value < 1) return `${Math.round(value * 1000)} g`;
  if (refUnit === 'L' && value < 1) return formatSize(Math.round(value * 1000), 'ml');
  if (refUnit === 'piece')
    return value > 1 ? `${NUMBER.format(value)} pièces` : `${NUMBER.format(value)} pièce`;
  return `${NUMBER.format(value)} ${REF_UNIT_LABEL[refUnit]}`;
}
