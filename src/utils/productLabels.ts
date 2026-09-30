import type { Product } from '../types/catalog';
import { formatPack, formatRefQuantity } from './units';

/** Libellé complet d'un produit, utilisé par les lecteurs d'écran : « Lait demi-écrémé UHT Lactel 1 L ». */
export function productTitle(product: Product): string {
  const brand = product.brandType === 'sans-marque' ? '' : ` ${product.brand}`;
  return `${product.name}${brand}${product.soldByWeight ? '' : ` ${formatPack(product.pack)}`}`;
}

/** Quantité affichée dans la liste : « 2 » conditionnements, ou « 1,5 kg » pour un produit au poids. */
export function productQuantityLabel(product: Product, quantity: number): string {
  return product.soldByWeight ? formatRefQuantity(quantity, 'kg') : String(quantity);
}
