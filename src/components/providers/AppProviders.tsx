import type { ReactNode } from 'react';
import { CatalogProvider } from './CatalogProvider';
import { SettingsProvider } from './SettingsProvider';
import { ShoppingListProvider } from './ShoppingListProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <CatalogProvider>
        <ShoppingListProvider>{children}</ShoppingListProvider>
      </CatalogProvider>
    </SettingsProvider>
  );
}
