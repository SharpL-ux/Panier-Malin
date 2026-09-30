import { useContext, type Context } from 'react';
import { CatalogContext, SettingsContext, ShoppingListContext } from './contexts';

function useRequired<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context);
  if (!value) throw new Error(`${name} doit être utilisé à l'intérieur de <AppProviders>.`);
  return value;
}

export function useSettings() {
  return useRequired(SettingsContext, 'useSettings');
}

export function useCatalog() {
  return useRequired(CatalogContext, 'useCatalog');
}

export function useShoppingList() {
  return useRequired(ShoppingListContext, 'useShoppingList');
}
