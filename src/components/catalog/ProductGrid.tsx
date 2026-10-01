import { useMemo, useState } from 'react';
import { useOffers } from '../../hooks/useOffers';
import { unitCents } from '../../services/pricing';
import { storeLabel } from '../../services/stores';
import { refUnitOf } from '../../utils/units';
import { PriceDialog } from '../prices/PriceDialog';
import type { PriceLabelValue } from '../ui/PriceLabel';
import { getEnseigne } from '../../data/enseignes';
import { useCatalog, useSettings, useShoppingList } from '../../hooks/useAppContexts';
import { referenceAt } from '../../services/catalog';
import { findItem } from '../../services/shoppingList';
import type { Product } from '../../types/catalog';
import { ProductCard } from './ProductCard';

export const PAGE_SIZE = 48;

/**
 * Grille de fiches affichée par tranches, pour garder un catalogue fluide sur mobile.
 * Le composant parent change la `key` quand les filtres changent, ce qui remet la pagination à zéro.
 */
export function ProductGrid({ products }: { products: Product[] }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { enseigne, stores } = useSettings();
  const { offerFor } = useOffers();
  const [editing, setEditing] = useState<Product | null>(null);
  const storeById = new Map(stores.map((st) => [st.id, st]));
  const { favorites, toggleFavorite } = useCatalog();
  const { list, addProduct, changeQuantity } = useShoppingList();
  const visible = useMemo(() => products.slice(0, limit), [products, limit]);
  const remaining = products.length - visible.length;
  const enseigneLabel = enseigne === 'all' ? null : getEnseigne(enseigne).label;

  const priceOf = (product: Product): PriceLabelValue | null => {
    const offer = offerFor(product);
    if (!offer) return null;
    const { observation } = offer.selected;
    const store = storeById.get(offer.storeId);
    return {
      cents: offer.cents,
      unitCents: unitCents(product, observation),
      refUnit: refUnitOf(product.pack),
      storeLabel: store ? storeLabel(store) : undefined,
      date: observation.date,
      source: observation.source,
      stale: offer.selected.stale,
      fallbackFrom: observation.fallbackFrom,
    };
  };

  return (
    <div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
        {visible.map((product) => (
          <li key={product.id} className="flex">
            <div className="flex w-full flex-col [&>article]:flex-1">
              <ProductCard
                product={product}
                enseigneLabel={enseigneLabel}
                reference={enseigne === 'all' ? undefined : referenceAt(product, enseigne)}
                price={priceOf(product)}
                item={findItem(list, product.id)}
                isFavorite={favorites.has(product.id)}
                onToggleFavorite={toggleFavorite}
                onEditPrice={setEditing}
                onAdd={addProduct}
                onChangeQuantity={changeQuantity}
              />
            </div>
          </li>
        ))}
      </ul>
      {editing && <PriceDialog product={editing} open onClose={() => setEditing(null)} />}
      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="h-11 rounded-full border border-line-strong bg-surface px-5 font-medium hover:bg-surface-2"
          >
            Afficher {Math.min(PAGE_SIZE, remaining)} produits de plus
            <span className="text-ink-soft"> sur {remaining}</span>
          </button>
        </div>
      )}
    </div>
  );
}
