import { describe, expect, it, vi } from 'vitest';
import { PRICES, TEST_EAN } from '../test/openPricesFixtures';
import type { Product } from '../types/catalog';
import type { Store } from '../types/stores';
import { parseOpenPrice, type ParsedOpenPrice } from './openPrices';
import {
  createManualPriceProvider,
  createOpenPricesProvider,
  manualObservations,
  observationsFromOpenPrices,
} from './priceProviders';

const lait: Product = {
  id: 'lait',
  name: 'Lait demi-écrémé UHT',
  categoryId: 'cremerie',
  icon: '🥛',
  pack: { count: 1, size: 1000, unit: 'ml' },
  soldByWeight: false,
  halal: false,
  references: [{ enseigne: 'lidl', brand: 'Milbona', ean: TEST_EAN }],
};
const bananes: Product = {
  ...lait,
  id: 'bananes',
  name: 'Bananes',
  categoryId: 'fruits',
  soldByWeight: true,
  pack: { count: 1, size: 1000, unit: 'g' },
  references: [],
  offCategoryTag: 'en:bananas',
};
const lidl: Store = {
  id: 'op-101',
  name: 'Lidl',
  enseigne: 'lidl',
  address: '',
  city: 'Courbevoie',
  locationId: 101,
};
const carrefour: Store = {
  id: 'op-102',
  name: 'Carrefour Market',
  enseigne: 'carrefour',
  address: '',
  city: 'Courbevoie',
  locationId: 102,
};
const perso: Store = {
  id: 'perso-1',
  name: 'Marka Market',
  enseigne: 'marka',
  address: '',
  city: 'Paris',
};
const parsed = PRICES.map(parseOpenPrice).filter((p): p is ParsedOpenPrice => p !== null);

describe('rattachement des prix Open Prices', () => {
  it('rattache un code-barres au magasin où il a été relevé, pour la bonne enseigne', () => {
    const obs = observationsFromOpenPrices(parsed, [lait], [lidl, carrefour], false);
    expect(obs).toEqual([
      {
        productId: 'lait',
        storeId: 'op-101',
        cents: 95,
        per: 'pack',
        pack: lait.pack,
        date: '2026-09-20',
        source: 'open-prices',
        openPricesId: 1,
      },
    ]);
  });

  it('emprunte le relevé d’un autre magasin de la même enseigne, en le signalant', () => {
    const obs = observationsFromOpenPrices(parsed, [lait], [lidl], true);
    expect(obs.find((o) => o.openPricesId === 2)).toMatchObject({
      storeId: 'op-101',
      cents: 89,
      fallbackFrom: 'Lidl, Puteaux',
    });
    // Un relevé chez Carrefour ne sert pas pour une référence Lidl.
    expect(obs.some((o) => o.openPricesId === 11)).toBe(false);
  });

  it('rattache les prix du vrac au kilo à vos magasins seulement', () => {
    const obs = observationsFromOpenPrices(parsed, [bananes], [lidl, carrefour], true);
    expect(obs.map((o) => [o.storeId, o.cents, o.per])).toEqual([
      ['op-101', 199, 'kg'],
      ['op-102', 239, 'kg'],
    ]);
  });

  it('cherche un produit personnalisé précis dans toutes les enseignes', () => {
    const custom: Product = { ...lait, id: 'perso-x', references: [], ean: TEST_EAN, custom: true };
    const obs = observationsFromOpenPrices(parsed, [custom], [lidl, carrefour], false);
    expect(obs.map((o) => [o.storeId, o.cents])).toEqual([
      ['op-101', 95],
      ['op-102', 99],
    ]);
  });

  it('n’interroge Open Prices que s’il y a des magasins et des codes à chercher', async () => {
    const fetchPrices = vi.fn().mockResolvedValue(parsed);
    const provider = createOpenPricesProvider(fetchPrices);
    expect(
      await provider.getObservations({
        products: [lait],
        stores: [perso],
        sameEnseigneFallback: true,
      }),
    ).toEqual([]);
    const sansCode = {
      ...lait,
      references: [{ enseigne: 'lidl' as const, brand: 'Milbona', ean: '' }],
    };
    expect(
      await provider.getObservations({
        products: [sansCode],
        stores: [lidl],
        sameEnseigneFallback: true,
      }),
    ).toEqual([]);
    expect(fetchPrices).not.toHaveBeenCalled();

    const today = new Date(2026, 9, 1);
    await provider.getObservations({
      products: [lait, bananes],
      stores: [lidl, perso],
      sameEnseigneFallback: false,
      today,
    });
    expect(fetchPrices).toHaveBeenCalledWith(
      {
        codes: [TEST_EAN],
        categoryTags: ['en:bananas'],
        locationIds: [101],
        since: '2025-10-01',
        withFallback: false,
      },
      undefined,
    );
  });
});

describe('prix saisis', () => {
  it('deviennent des relevés pour les fiches et magasins connus', async () => {
    const prices = {
      'lait|perso-1': { cents: 105, per: 'pack' as const, date: '2026-09-30' },
      'bananes|op-101': { cents: 189, per: 'kg' as const, date: '2026-09-30' },
      'inconnu|op-101': { cents: 1, per: 'pack' as const, date: '2026-09-30' },
    };
    expect(manualObservations(prices, [lait, bananes], [lidl, perso])).toEqual([
      {
        productId: 'lait',
        storeId: 'perso-1',
        cents: 105,
        per: 'pack',
        pack: lait.pack,
        date: '2026-09-30',
        source: 'manuel',
      },
      {
        productId: 'bananes',
        storeId: 'op-101',
        cents: 189,
        per: 'kg',
        date: '2026-09-30',
        source: 'manuel',
      },
    ]);
    const provider = createManualPriceProvider(() => prices);
    expect(
      await provider.getObservations({
        products: [lait],
        stores: [perso],
        sameEnseigneFallback: true,
      }),
    ).toHaveLength(1);
  });
});
