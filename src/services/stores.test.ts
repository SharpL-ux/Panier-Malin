import { describe, expect, it } from 'vitest';
import type { Store } from '../types/stores';
import {
  addStore,
  enseigneFromText,
  MAX_STORES,
  removeStore,
  setMainStore,
  storeLabel,
} from './stores';

const store = (id: string, patch: Partial<Store> = {}): Store => ({
  id,
  name: 'Lidl',
  enseigne: 'lidl',
  address: '',
  city: 'Courbevoie',
  ...patch,
});

describe('magasins', () => {
  it('reconnaît l’enseigne dans les noms et marques OpenStreetMap', () => {
    expect(enseigneFromText('Carrefour Market')).toBe('carrefour');
    expect(enseigneFromText(null, 'E.Leclerc Drive')).toBe('leclerc');
    expect(enseigneFromText('LIDL')).toBe('lidl');
    expect(enseigneFromText('Marka Market')).toBe('marka');
    expect(enseigneFromText('H Market')).toBe('hmarket');
    expect(enseigneFromText('Franprix')).toBeNull();
  });

  it('ajoute sans doublon, et le premier magasin devient le principal', () => {
    let state = addStore({ stores: [] }, store('op-1'));
    state = addStore(state, store('op-1'));
    state = addStore(state, store('op-2'));
    expect(state.stores.map((s) => s.id)).toEqual(['op-1', 'op-2']);
    expect(state.mainStoreId).toBe('op-1');
  });

  it('limite le nombre de magasins comparés', () => {
    let state = { stores: [] as Store[] };
    for (let i = 0; i < MAX_STORES + 3; i += 1) state = addStore(state, store(`op-${i}`));
    expect(state.stores).toHaveLength(MAX_STORES);
  });

  it('choisit un autre magasin principal quand le principal est retiré', () => {
    let state = addStore(addStore({ stores: [] }, store('op-1')), store('op-2'));
    state = setMainStore(state, 'op-2');
    expect(removeStore(state, 'op-2').mainStoreId).toBe('op-1');
    expect(removeStore(removeStore(state, 'op-1'), 'op-2')).toEqual({ stores: [] });
  });

  it('affiche le magasin avec sa ville', () => {
    expect(storeLabel(store('op-1'))).toBe('Lidl, Courbevoie');
    expect(storeLabel(store('op-2', { city: '' }))).toBe('Lidl');
  });
});
