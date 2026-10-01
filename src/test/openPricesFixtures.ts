import { http, HttpResponse } from 'msw';
import { OPEN_PRICES_API_URL } from '../services/endpoints';

/**
 * Données simulées au format de l'API Open Prices (champs vérifiés dans le code source
 * du serveur). Les codes-barres sont des exemples de test, pas des produits réels.
 */
export const TEST_EAN = '4006381333931';

export const LOCATIONS = [
  {
    id: 101,
    type: 'OSM',
    osm_id: 1001,
    osm_type: 'NODE',
    osm_name: 'Lidl',
    osm_brand: 'Lidl',
    osm_display_name:
      'Lidl, 12, Rue de Bezons, Courbevoie, Nanterre, Hauts-de-Seine, France, 92400, France',
    osm_address_postcode: '92400',
    osm_address_city: 'Courbevoie',
    osm_lat: 48.9,
    osm_lon: 2.25,
    price_count: 340,
  },
  {
    id: 102,
    type: 'OSM',
    osm_id: 1002,
    osm_type: 'WAY',
    osm_name: 'Carrefour Market',
    osm_brand: 'Carrefour Market',
    osm_display_name:
      'Carrefour Market, 5, Place Charras, Courbevoie, Nanterre, Hauts-de-Seine, France, 92400, France',
    osm_address_postcode: '92400',
    osm_address_city: 'Courbevoie',
    osm_lat: 48.897,
    osm_lon: 2.256,
    price_count: 120,
  },
  {
    id: 103,
    type: 'OSM',
    osm_id: 1003,
    osm_type: 'NODE',
    osm_name: 'Lidl',
    osm_brand: 'Lidl',
    osm_display_name:
      'Lidl, 3, Rue Voltaire, Puteaux, Nanterre, Hauts-de-Seine, France, 92800, France',
    osm_address_postcode: '92800',
    osm_address_city: 'Puteaux',
    price_count: 80,
  },
];

const location = (id: number) => LOCATIONS.find((l) => l.id === id)!;

function price(id: number, patch: Record<string, unknown>) {
  const locationId = (patch.location_id as number) ?? 101;
  return {
    id,
    type: 'PRODUCT',
    product_code: null,
    category_tag: null,
    price: 1,
    price_is_discounted: false,
    price_without_discount: null,
    price_per: null,
    currency: 'EUR',
    location_id: locationId,
    location: location(locationId),
    date: '2026-09-20',
    duplicate_of: null,
    ...patch,
  };
}

export const PRICES = [
  price(1, { product_code: TEST_EAN, price: 0.95, location_id: 101, date: '2026-09-20' }),
  price(2, { product_code: TEST_EAN, price: 0.89, location_id: 103, date: '2026-09-25' }),
  price(3, {
    type: 'CATEGORY',
    category_tag: 'en:bananas',
    price: 1.99,
    price_per: 'KILOGRAM',
    location_id: 101,
  }),
  price(4, {
    type: 'CATEGORY',
    category_tag: 'en:bananas',
    price: 2.39,
    price_per: 'KILOGRAM',
    location_id: 102,
  }),
  price(5, {
    type: 'CATEGORY',
    category_tag: 'en:apples',
    price: 2.49,
    price_per: 'KILOGRAM',
    location_id: 101,
  }),
  price(6, {
    type: 'CATEGORY',
    category_tag: 'en:apples',
    price: 2.19,
    price_per: 'KILOGRAM',
    location_id: 102,
  }),
  price(7, {
    type: 'CATEGORY',
    category_tag: 'en:avocados',
    price: 0.99,
    price_per: 'UNIT',
    location_id: 102,
  }),
  // Écartés : promotion sans prix normal, autre devise, doublon.
  price(8, {
    product_code: TEST_EAN,
    price: 0.5,
    price_is_discounted: true,
    location_id: 101,
    date: '2026-09-29',
  }),
  price(9, {
    product_code: TEST_EAN,
    price: 1.2,
    currency: 'CHF',
    location_id: 101,
    date: '2026-09-29',
  }),
  price(10, {
    product_code: TEST_EAN,
    price: 0.7,
    duplicate_of: 1,
    location_id: 101,
    date: '2026-09-29',
  }),
  // Promotion dont le prix normal est connu : on garde le prix normal.
  price(11, {
    product_code: TEST_EAN,
    price: 0.79,
    price_is_discounted: true,
    price_without_discount: 0.99,
    location_id: 102,
    date: '2026-09-18',
  }),
];

function paginate(items: unknown[], url: URL) {
  const size = Math.min(Number(url.searchParams.get('size') ?? 10), 100);
  const page = Number(url.searchParams.get('page') ?? 1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  return HttpResponse.json({
    items: items.slice((page - 1) * size, page * size),
    page,
    pages,
    size,
    total: items.length,
  });
}

const contains = (value: unknown, needle: string | null) =>
  !needle ||
  String(value ?? '')
    .toLowerCase()
    .includes(needle.toLowerCase());

export const openPricesHandlers = [
  http.get(`${OPEN_PRICES_API_URL}/locations/nearby`, ({ request }) =>
    paginate(LOCATIONS, new URL(request.url)),
  ),
  http.get(`${OPEN_PRICES_API_URL}/locations`, ({ request }) => {
    const url = new URL(request.url);
    const city = url.searchParams.get('osm_address_city__like');
    const name = url.searchParams.get('osm_name__like');
    const items = LOCATIONS.filter(
      (l) => contains(l.osm_address_city, city) && contains(l.osm_name, name),
    );
    return paginate(items, url);
  }),
  http.get(`${OPEN_PRICES_API_URL}/prices`, ({ request }) => {
    const url = new URL(request.url);
    const p = (k: string) => url.searchParams.get(k);
    const codes = p('product_code__in')?.split(',');
    const locations = p('location_id__in')?.split(',').map(Number);
    let items = PRICES.filter(
      (x) =>
        (!codes || codes.includes(String(x.product_code))) &&
        (!p('product_code') || x.product_code === p('product_code')) &&
        (!locations || locations.includes(x.location_id)) &&
        (!p('type') || x.type === p('type')) &&
        (!p('category_tag') || x.category_tag === p('category_tag')) &&
        (!p('date__gte') || x.date >= p('date__gte')!),
    );
    if (p('order_by') === '-date') items = [...items].sort((a, b) => b.date.localeCompare(a.date));
    if (p('order_by') === 'date') items = [...items].sort((a, b) => a.date.localeCompare(b.date));
    return paginate(items, url);
  }),
];
