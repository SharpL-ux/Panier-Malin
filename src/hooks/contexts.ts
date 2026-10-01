import { createContext } from 'react';
import type { Catalog } from '../services/catalog';
import type { EnseigneId, Product } from '../types/catalog';
import type { ShoppingList } from '../types/list';
import type { ManualPrice, SelectedPrice } from '../types/prices';
import type { ComparatorOptions, Store } from '../types/stores';

export type Theme = 'light' | 'dark';
export type EnseigneChoice = EnseigneId | 'all';

export interface SettingsValue {
  theme: Theme;
  toggleTheme: () => void;
  enseigne: EnseigneChoice;
  setEnseigne: (value: EnseigneChoice) => void;
  stores: Store[];
  mainStoreId?: string;
  /** Renvoie faux si le magasin n'a pas pu être ajouté (doublon ou limite atteinte). */
  addStore: (store: Store) => boolean;
  removeStore: (storeId: string) => void;
  setMainStore: (storeId: string) => void;
  options: ComparatorOptions;
  setOptions: (patch: Partial<ComparatorOptions>) => void;
}

export interface CatalogValue {
  catalog: Catalog;
  addCustomProduct: (product: Product) => void;
  favorites: Set<string>;
  toggleFavorite: (productId: string) => void;
}

export interface ShoppingListValue {
  /** Liste ouverte. */
  list: ShoppingList;
  /** Toutes les listes, de la plus récente à la plus ancienne. */
  lists: ShoppingList[];
  selectList: (listId: string) => void;
  /** Nouvelle liste pour la semaine en cours, vide ou reprise d'une liste existante. */
  startNewList: (fromListId?: string) => void;
  deleteList: (listId: string) => void;
  renameList: (name: string) => void;
  addProduct: (product: Product) => void;
  addProducts: (products: Product[]) => void;
  changeQuantity: (itemId: string, steps: number) => void;
  removeItem: (itemId: string) => void;
  toggleChecked: (itemId: string) => void;
  setNote: (itemId: string, note: string) => void;
  uncheckAll: () => void;
  assignStores: (assignments: Record<string, string | undefined>) => void;
  clearAssignments: () => void;
}

export type PricesStatus = 'sans-magasin' | 'chargement' | 'pret' | 'erreur';

export interface PricesValue {
  status: PricesStatus;
  error?: string;
  /** Date de la dernière mise à jour des prix Open Prices (millisecondes). */
  updatedAt?: number;
  refresh: () => void;
  /** Prix retenu pour une fiche dans un magasin, selon les règles de choix. */
  priceAt: (productId: string, storeId: string) => SelectedPrice | null;
  manualPrice: (productId: string, storeId: string) => ManualPrice | undefined;
  setManualPrice: (productId: string, storeId: string, price: ManualPrice) => void;
  removeManualPrice: (productId: string, storeId: string) => void;
}

export const PricesContext = createContext<PricesValue | null>(null);
export const SettingsContext = createContext<SettingsValue | null>(null);
export const CatalogContext = createContext<CatalogValue | null>(null);
export const ShoppingListContext = createContext<ShoppingListValue | null>(null);
