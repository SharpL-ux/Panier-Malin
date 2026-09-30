import type { CategoryId } from './catalog';

/** Un article vise soit un produit précis (marque imposée), soit n'importe quel produit d'un groupe. */
export type ListItemTarget =
  { kind: 'produit'; productId: string } | { kind: 'generique'; groupId: string };

export interface ListItem {
  id: string;
  target: ListItemTarget;
  /**
   * Produit précis : nombre de conditionnements (ou kg si vendu au poids).
   * Générique : besoin exprimé dans l'unité de référence du groupe (2 → 2 L).
   */
  quantity: number;
  /** Pas du sélecteur +/- (pour un générique : le format du produit d'origine, ex. 1 L). */
  step: number;
  /** Catégorie mémorisée pour regrouper la liste par rayon. */
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
