import type { CategoryId } from './catalog';

export interface ListItem {
  id: string;
  /** Fiche produit du catalogue (ou produit personnalisé). */
  productId: string;
  /** Nombre de conditionnements de la fiche, ou kg pour un produit vendu au poids. */
  quantity: number;
  /** Pas du sélecteur +/- : 1 conditionnement, ou 0,5 kg au poids. */
  step: number;
  /** Rayon mémorisé pour regrouper la liste. */
  categoryId: CategoryId;
  note?: string;
  checked: boolean;
  /** Magasin affecté, manuellement ou par le panier optimal. */
  assignedStoreId?: string;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  /** Lundi de la semaine, AAAA-MM-JJ. */
  weekOf: string;
  items: ListItem[];
  createdAt: string;
  updatedAt: string;
}
