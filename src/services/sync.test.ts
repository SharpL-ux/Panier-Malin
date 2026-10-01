import { describe, expect, it } from 'vitest';
import { readValue, SCHEMA_VERSION, writeValue } from './storage';
import { createLocalSyncAdapter, parseSnapshot, restoreSnapshot, takeSnapshot } from './sync';

describe('synchronisation (préparation)', () => {
  it('prend un instantané des seules données présentes', () => {
    writeValue('favoris', ['bananes']);
    writeValue('magasins', { stores: [], mainStoreId: undefined });
    const snapshot = takeSnapshot(new Date('2026-10-01T08:00:00Z'));
    expect(snapshot).toMatchObject({
      app: 'panier-malin',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: '2026-10-01T08:00:00.000Z',
    });
    expect(Object.keys(snapshot.data).sort()).toEqual(['favoris', 'magasins']);
  });

  it('relit une sauvegarde et refuse les fichiers étrangers ou d’une autre version', () => {
    const text = JSON.stringify({
      app: 'panier-malin',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: 'x',
      data: { favoris: ['riz'], inconnu: 1 },
    });
    expect(parseSnapshot(text)?.data).toEqual({ favoris: ['riz'] });
    expect(parseSnapshot('pas du json')).toBeNull();
    expect(
      parseSnapshot(JSON.stringify({ app: 'autre', schemaVersion: SCHEMA_VERSION, data: {} })),
    ).toBeNull();
    expect(
      parseSnapshot(
        JSON.stringify({ app: 'panier-malin', schemaVersion: SCHEMA_VERSION + 1, data: {} }),
      ),
    ).toBeNull();
  });

  it('restaure un instantané, aller-retour par l’adaptateur local', async () => {
    writeValue('favoris', ['bananes']);
    const adapter = createLocalSyncAdapter();
    const snapshot = await adapter.pull();
    writeValue('favoris', []);
    expect(restoreSnapshot(snapshot!)).toBe(1);
    expect(readValue('favoris', [] as string[])).toEqual(['bananes']);
    await adapter.push({ ...snapshot!, data: { favoris: ['pommes'] } });
    expect(readValue('favoris', [] as string[])).toEqual(['pommes']);
  });
});
