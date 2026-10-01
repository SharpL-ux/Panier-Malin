import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, type ReactNode } from 'react';
import { SCHEMA_VERSION, STORAGE_PREFIX } from '../../services/storage';
import { CatalogProvider } from './CatalogProvider';
import { DAY_MS, PricesProvider } from './PricesProvider';
import { SettingsProvider } from './SettingsProvider';
import { ShoppingListProvider } from './ShoppingListProvider';

function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );
  // Le cache des réponses Open Prices survit au rechargement de la page pendant 24 h.
  const [persister] = useState(() =>
    createSyncStoragePersister({ storage: safeLocalStorage(), key: `${STORAGE_PREFIX}cache-prix` }),
  );
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: DAY_MS, buster: `v${SCHEMA_VERSION}` }}
    >
      <SettingsProvider>
        <CatalogProvider>
          <ShoppingListProvider>
            <PricesProvider>{children}</PricesProvider>
          </ShoppingListProvider>
        </CatalogProvider>
      </SettingsProvider>
    </PersistQueryClientProvider>
  );
}
