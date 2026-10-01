import { http, HttpResponse } from 'msw';
import { OFF_PRODUCT_URL } from '../services/endpoints';
import { openPricesHandlers } from './openPricesFixtures';

/**
 * Réponses simulées au format exact des API. Les codes-barres utilisés ici sont des
 * exemples de test (clé de contrôle valide), pas de vrais produits du catalogue.
 */
export const OFF_FIXTURES: Record<string, Record<string, unknown>> = {
  '4006381333931': {
    code: '4006381333931',
    product_name: 'Produit de test',
    product_name_fr: 'Lait demi-écrémé de test',
    brands: 'Marque Test, Autre marque',
    image_front_small_url: 'https://images.openfoodfacts.org/test.jpg',
    quantity: '1 L',
    product_quantity: '1000',
    product_quantity_unit: 'ml',
    categories_tags: ['en:dairies', 'en:milks'],
  },
};

export const handlers = [
  ...openPricesHandlers,
  http.get(`${OFF_PRODUCT_URL}/:ean`, ({ params }) => {
    const product = OFF_FIXTURES[String(params.ean)];
    if (!product) {
      return HttpResponse.json(
        { code: params.ean, status: 0, status_verbose: 'product not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      code: params.ean,
      status: 1,
      status_verbose: 'product found',
      product,
    });
  }),
];
