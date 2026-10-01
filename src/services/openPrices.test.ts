import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { LOCATIONS, PRICES, TEST_EAN } from '../test/openPricesFixtures';
import { server } from '../test/server';
import { OPEN_PRICES_API_URL } from './endpoints';
import {
  getPriceHistory,
  getPricesForList,
  locationToStore,
  nearbyLocations,
  OpenPricesError,
  parseOpenPrice,
  searchLocations,
} from './openPrices';

vi.mock('../utils/rateLimiter', () => ({
  createRateLimiter:
    () =>
    <T>(task: () => Promise<T>) =>
      task(),
}));

describe('Open Prices : magasins', () => {
  it('transforme un magasin Open Prices en magasin de l’application, enseigne reconnue', () => {
    expect(locationToStore(LOCATIONS[1])).toEqual({
      id: 'op-102',
      name: 'Carrefour Market',
      enseigne: 'carrefour',
      address: '5 Place Charras, 92400 Courbevoie',
      city: 'Courbevoie',
      locationId: 102,
      lat: 48.897,
      lon: 2.256,
      priceCount: 120,
    });
  });

  it('cherche par ville ou par nom, sans doublon, les plus renseignés d’abord', async () => {
    const stores = await searchLocations('courbevoie');
    expect(stores.map((s) => s.id)).toEqual(['op-101', 'op-102']);
    expect((await searchLocations('lidl')).map((s) => s.city)).toEqual(['Courbevoie', 'Puteaux']);
    expect(await searchLocations('a')).toEqual([]);
  });

  it('trouve les magasins autour d’un point', async () => {
    expect(await nearbyLocations(48.9, 2.25)).toHaveLength(3);
  });

  it('explique une panne du service', async () => {
    server.use(
      http.get(`${OPEN_PRICES_API_URL}/locations`, () => new HttpResponse(null, { status: 502 })),
    );
    await expect(searchLocations('courbevoie')).rejects.toBeInstanceOf(OpenPricesError);
  });
});

describe('Open Prices : prix', () => {
  it('lit un prix en centimes et écarte les relevés inexploitables', () => {
    const parsed = PRICES.map(parseOpenPrice);
    expect(parsed[0]).toMatchObject({
      id: 1,
      type: 'PRODUCT',
      productCode: TEST_EAN,
      cents: 95,
      per: 'pack',
      locationId: 101,
    });
    expect(parsed[2]).toMatchObject({ categoryTag: 'en:bananas', cents: 199, per: 'kg' });
    expect(parsed[6]).toMatchObject({ categoryTag: 'en:avocados', cents: 99, per: 'piece' });
    expect(parsed[7]).toBeNull(); // promotion sans prix normal
    expect(parsed[8]).toBeNull(); // autre devise
    expect(parsed[9]).toBeNull(); // doublon
    expect(parsed[10]).toMatchObject({ cents: 99 }); // prix normal d'une promotion
    expect(parsed[0]?.location?.enseigne).toBe('lidl');
  });

  it('récupère les prix d’une liste en requêtes groupées', async () => {
    const urls: string[] = [];
    server.events.on('request:start', ({ request }) => {
      urls.push(request.url);
    });
    const prices = await getPricesForList({
      codes: [TEST_EAN],
      categoryTags: ['en:bananas', 'en:apples'],
      locationIds: [101, 102],
      since: '2025-10-01',
      withFallback: false,
    });
    server.events.removeAllListeners();
    expect(prices.map((p) => p.id).sort((a, b) => a - b)).toEqual([1, 3, 4, 5, 6, 11]);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('product_code__in=4006381333931');
    expect(urls[0]).toContain('location_id__in=101%2C102');
  });

  it('inclut les autres magasins quand le repli sur l’enseigne est activé', async () => {
    const prices = await getPricesForList({
      codes: [TEST_EAN],
      categoryTags: [],
      locationIds: [101],
      since: '2025-10-01',
      withFallback: true,
    });
    expect(prices.map((p) => p.locationId).sort()).toEqual([101, 102, 103]);
  });

  it('découpe les longues listes de codes-barres en plusieurs requêtes', async () => {
    let calls = 0;
    server.events.on('request:start', () => {
      calls += 1;
    });
    const codes = Array.from({ length: 85 }, (_, i) => String(1000 + i));
    await getPricesForList({
      codes,
      categoryTags: [],
      locationIds: [101],
      since: '2025-10-01',
      withFallback: false,
    });
    server.events.removeAllListeners();
    expect(calls).toBe(3);
  });

  it('donne l’historique d’un produit, du plus ancien au plus récent', async () => {
    const history = await getPriceHistory({ code: TEST_EAN }, '2025-10-01');
    expect(history.map((p) => p.date)).toEqual(['2026-09-18', '2026-09-20', '2026-09-25']);
  });
});
