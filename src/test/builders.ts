import type { Line } from '../services/comparator';
import type { PriceGetter } from '../services/pricing';
import type { CategoryId, Product } from '../types/catalog';
import type { SelectedPrice } from '../types/prices';
import type { Store } from '../types/stores';

/** Petits constructeurs pour les tests de calcul (comparateur, panier, PDF). */
export const store = (id: string, patch: Partial<Store> = {}): Store => ({
  id,
  name: id,
  enseigne: null,
  address: '',
  city: '',
  ...patch,
});

export const product = (id: string, patch: Partial<Product> = {}): Product => ({
  id,
  name: id,
  categoryId: 'epicerie-salee' as CategoryId,
  icon: '🛒',
  pack: { count: 1, size: 1, unit: 'piece' },
  soldByWeight: false,
  halal: false,
  references: [],
  ...patch,
});

export const line = (
  id: string,
  quantity = 1,
  patch: Partial<Product> = {},
  note?: string,
): Line => {
  const p = product(id, patch);
  return {
    product: p,
    item: {
      id: `item-${id}`,
      productId: id,
      quantity,
      step: 1,
      categoryId: p.categoryId,
      checked: false,
      updatedAt: '2026-09-28T08:00:00.000Z',
      ...(note ? { note } : {}),
    },
  };
};

/** Prix en centimes par fiche et par magasin ; « ≈ » = relevé d'un autre magasin, « ! » = ancien. */
export function getter(
  table: Record<string, Record<string, number | string>>,
  date = '2026-09-20',
): PriceGetter {
  return (productId, storeId) => {
    const raw = table[productId]?.[storeId];
    if (raw === undefined) return null;
    const text = String(raw);
    const selected: SelectedPrice = {
      observation: {
        productId,
        storeId,
        cents: Number(text.replace(/[≈!]/g, '')),
        per: 'pack',
        date,
        source: 'open-prices',
        ...(text.includes('≈') ? { fallbackFrom: 'ailleurs' } : {}),
      },
      fallback: text.includes('≈'),
      stale: text.includes('!'),
    };
    return selected;
  };
}
