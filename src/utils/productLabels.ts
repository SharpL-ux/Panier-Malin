import type { Product } from '../types/catalog';
import { formatPack, formatRefQuantity } from './units';

/** Format affiché sur la carte : « 1 L », « 4 × 125 g », « Au poids », « À la pièce ». */
export function packLabel(product: Product): string {
  if (product.soldByWeight) return 'Au poids';
  const { count, size, unit } = product.pack;
  if (unit === 'piece' && count === 1 && size === 1) return 'À la pièce';
  return formatPack(product.pack);
}

/** Libellé complet, lu par les lecteurs d'écran : « Lait demi-écrémé UHT (1 L) ». */
export function productTitle(product: Product): string {
  const brand = product.brand ? ` ${product.brand}` : '';
  const pack = packLabel(product).replace(/^Au /, 'au ').replace(/^À /, 'à ');
  return `${product.name}${brand} (${pack})`;
}

/** Quantité affichée dans la liste : « 2 » conditionnements, ou « 1,5 kg » pour un produit au poids. */
export function productQuantityLabel(product: Product, quantity: number): string {
  return product.soldByWeight ? formatRefQuantity(quantity, 'kg') : String(quantity);
}
