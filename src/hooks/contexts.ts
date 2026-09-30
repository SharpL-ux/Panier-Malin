import { createContext } from 'react';
import type { Catalog } from '../services/catalog';
import type { EnseigneId, Product } from '../types/catalog';
import type { ShoppingList } from '../types/list';

export type Theme = 'light' | 'dark';
export type EnseigneChoice = EnseigneId | 'all';

export interface SettingsValue {
  theme: Theme;
  toggleTheme: () => void;
  enseigne: EnseigneChoice;
  setEnseigne: (value: EnseigneChoice) => void;
}

export interface CatalogValue {
  catalog: Catalog;
  addCustomProduct: (product: Product) => void;
}

export interface ShoppingListValue {
  list: ShoppingList;
  addProduct: (product: Product) => void;
  changeQuantity: (itemId: string, steps: number) => void;
  removeItem: (itemId: string) => void;
}

export const SettingsContext = createContext<SettingsValue | null>(null);
export const CatalogContext = createContext<CatalogValue | null>(null);
export const ShoppingListContext = createContext<ShoppingListValue | null>(null);
