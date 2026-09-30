import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readValue, STORAGE_PREFIX, writeValue } from '../services/storage';

/** useState persisté dans le localStorage, synchronisé entre les onglets ouverts. */
export function usePersistentState<T>(
  key: string,
  initial: () => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => readValue(key, initial()));

  useEffect(() => {
    writeValue(key, state);
  }, [key, state]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_PREFIX + key) setState((current) => readValue(key, current));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [state, setState];
}
