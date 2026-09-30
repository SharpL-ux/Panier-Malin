import { describe, expect, it } from 'vitest';
import { readValue, SCHEMA_VERSION, STORAGE_PREFIX, writeValue } from './storage';

const raw = (key: string, value: unknown) =>
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));

describe('stockage local versionné', () => {
  it('relit ce qu’il a écrit, avec le numéro de schéma courant', () => {
    writeValue('essai', { a: 1 });
    expect(JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'essai')!)).toEqual({
      v: SCHEMA_VERSION,
      data: { a: 1 },
    });
    expect(readValue('essai', null)).toEqual({ a: 1 });
  });

  it('renvoie la valeur par défaut si la donnée est absente ou corrompue', () => {
    expect(readValue('absent', 'défaut')).toBe('défaut');
    localStorage.setItem(STORAGE_PREFIX + 'casse', '{pas du json');
    expect(readValue('casse', 'défaut')).toBe('défaut');
  });

  it('migre les listes v1 : les listes sont gardées, leurs anciens articles retirés', () => {
    raw('listes', {
      v: 1,
      data: {
        currentId: 'l1',
        lists: [
          {
            id: 'l1',
            name: 'Semaine du 28/09/2026',
            items: [{ target: { kind: 'generique', groupId: 'lait' } }],
          },
        ],
      },
    });
    expect(readValue('listes', null)).toEqual({
      currentId: 'l1',
      lists: [{ id: 'l1', name: 'Semaine du 28/09/2026', items: [] }],
    });
  });

  it('migre les produits personnalisés v1 vers des fiches', () => {
    raw('catalogue:produits-perso', {
      v: 1,
      data: [
        {
          id: 'perso-kombucha',
          name: 'Kombucha',
          brand: 'Marque X',
          brandType: 'nationale',
          enseignes: [],
          categoryId: 'boissons',
          icon: '🥤',
          ean: '4006381333931',
          pack: { count: 1, size: 330, unit: 'ml' },
          soldByWeight: false,
          equivalenceGroup: 'perso-groupe-perso-kombucha',
          flags: { bio: true, halal: false },
          custom: true,
        },
      ],
    });
    expect(readValue('catalogue:produits-perso', [])).toEqual([
      {
        id: 'perso-kombucha',
        name: 'Kombucha',
        categoryId: 'boissons',
        icon: '🥤',
        pack: { count: 1, size: 330, unit: 'ml' },
        soldByWeight: false,
        halal: false,
        references: [],
        brand: 'Marque X',
        ean: '4006381333931',
        custom: true,
      },
    ]);
  });
});
