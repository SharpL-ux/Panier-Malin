import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../test/server';
import { fetchOffProduct, OFF_PRODUCT_URL, OffLookupError, packFromOff } from './openFoodFacts';

// Neutralise l'attente entre deux appels pour que les tests restent rapides.
vi.mock('../utils/rateLimiter', () => ({
  createRateLimiter:
    () =>
    <T>(task: () => Promise<T>) =>
      task(),
}));

describe('Open Food Facts : recherche par code-barres', () => {
  it('renvoie nom, marque, image et format', async () => {
    const info = await fetchOffProduct('4006381333931');
    expect(info).toEqual({
      ean: '4006381333931',
      name: 'Lait demi-écrémé de test',
      brand: 'Marque Test',
      imageUrl: 'https://images.openfoodfacts.org/test.jpg',
      quantityLabel: '1 L',
      pack: { count: 1, size: 1000, unit: 'ml' },
      categoriesTags: ['en:dairies', 'en:milks'],
    });
  });

  it('renvoie null pour un produit inconnu', async () => {
    await expect(fetchOffProduct('73513537')).resolves.toBeNull();
  });

  it('refuse un code-barres invalide sans appeler l’API', async () => {
    const spy = vi.fn();
    server.events.on('request:start', spy);
    await expect(fetchOffProduct('1234')).rejects.toBeInstanceOf(OffLookupError);
    expect(spy).not.toHaveBeenCalled();
    server.events.removeAllListeners();
  });

  it('met la réponse en cache pour ne pas rappeler l’API', async () => {
    let calls = 0;
    server.use(
      http.get(`${OFF_PRODUCT_URL}/:ean`, () => {
        calls += 1;
        return HttpResponse.json({ status: 1, product: { product_name: 'En cache' } });
      }),
    );
    await fetchOffProduct('036000291452');
    const second = await fetchOffProduct('036000291452');
    expect(second?.name).toBe('En cache');
    expect(calls).toBe(1);
  });

  it('explique clairement une panne réseau ou serveur', async () => {
    server.use(http.get(`${OFF_PRODUCT_URL}/:ean`, () => HttpResponse.error()));
    await expect(fetchOffProduct('4006381333931')).rejects.toThrow(/injoignable/);
    server.use(http.get(`${OFF_PRODUCT_URL}/:ean`, () => new HttpResponse(null, { status: 503 })));
    await expect(fetchOffProduct('4006381333931')).rejects.toThrow(/503/);
  });
});

describe('conversion des quantités Open Food Facts', () => {
  it('gère g, kg, ml, cl et L, en nombre ou en texte', () => {
    expect(packFromOff('500', 'g')).toEqual({ count: 1, size: 500, unit: 'g' });
    expect(packFromOff(1.5, 'kg')).toEqual({ count: 1, size: 1500, unit: 'g' });
    expect(packFromOff('75', 'cl')).toEqual({ count: 1, size: 750, unit: 'ml' });
    expect(packFromOff('1', 'L')).toEqual({ count: 1, size: 1000, unit: 'ml' });
    expect(packFromOff('', 'g')).toBeUndefined();
    expect(packFromOff('3', 'pièces')).toBeUndefined();
  });
});
