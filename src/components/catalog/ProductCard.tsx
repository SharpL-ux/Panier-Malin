import { Plus } from 'lucide-react';
import { memo, type CSSProperties } from 'react';
import { getCategory } from '../../data/categories';
import type { Product, StoreReference } from '../../types/catalog';
import type { ListItem } from '../../types/list';
import { packLabel, productQuantityLabel, productTitle } from '../../utils/productLabels';
import { formatPack } from '../../utils/units';
import { PriceLabel, type PriceLabelValue } from '../ui/PriceLabel';
import { QuantityStepper } from '../ui/QuantityStepper';

interface Props {
  product: Product;
  /** Enseigne choisie en haut de l'écran, et la référence à y prendre si elle est connue. */
  enseigneLabel: string | null;
  reference?: StoreReference;
  price: PriceLabelValue | null;
  item?: ListItem;
  onAdd: (product: Product) => void;
  onChangeQuantity: (itemId: string, steps: number) => void;
}

const SANS_MARQUE = new Set(['fruits', 'legumes', 'boulangerie', 'produits-du-monde']);

/** Ce qu'il faut prendre en rayon dans l'enseigne choisie. */
function whatToTake(
  product: Product,
  enseigneLabel: string,
  reference?: StoreReference,
): { text: string; known: boolean } {
  if (reference) {
    const pack = reference.pack ? `, ${formatPack(reference.pack)}` : '';
    // « Chez Lidl : marque Lidl » plutôt que « Chez Lidl : Lidl ».
    const brand = reference.brand === enseigneLabel ? `marque ${reference.brand}` : reference.brand;
    return { text: `${brand}${pack}`, known: true };
  }
  if (product.brand) return { text: product.brand, known: true };
  if (product.halal) return { text: 'référence halal à trouver', known: false };
  if (product.references.length === 0 && SANS_MARQUE.has(product.categoryId)) {
    return { text: 'vrac ou sans marque', known: true };
  }
  return { text: 'référence à trouver', known: false };
}

export const ProductCard = memo(function ProductCard({
  product,
  enseigneLabel,
  reference,
  price,
  item,
  onAdd,
  onChangeQuantity,
}: Props) {
  const category = getCategory(product.categoryId);
  const title = productTitle(product);
  const take = enseigneLabel ? whatToTake(product, enseigneLabel, reference) : null;

  return (
    <article
      className="cat-strip flex flex-col gap-3 rounded-md border border-line bg-surface p-3 pl-4"
      style={{ '--cat': category.color } as CSSProperties}
    >
      <div className="flex gap-3">
        <div
          aria-hidden
          className="cat-tint grid size-12 shrink-0 place-items-center overflow-hidden rounded-md text-2xl"
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              className="size-full object-contain"
              loading="lazy"
            />
          ) : (
            product.icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 leading-tight font-semibold">{product.name}</h3>
          {product.brand && <p className="mt-0.5 text-sm font-medium">{product.brand}</p>}
          <ul
            className="mt-1.5 flex flex-wrap items-center gap-1 text-xs"
            aria-label="Caractéristiques"
          >
            <li className="rounded-[3px] border border-line px-1 py-0.5 text-ink-soft tabular">
              {packLabel(product)}
            </li>
            {product.halal && (
              <li className="rounded-[3px] border border-line-strong px-1.5 py-0.5 font-semibold">
                Certifié halal
              </li>
            )}
            {product.custom && (
              <li className="rounded-[3px] border border-dashed border-line-strong px-1.5 py-0.5 font-semibold">
                Ajouté par vous
              </li>
            )}
          </ul>
          {take && (
            <p className={`mt-1.5 text-sm ${take.known ? '' : 'text-ink-soft'}`}>
              Chez {enseigneLabel} :{' '}
              {take.known ? <span className="font-medium">{take.text}</span> : take.text}
            </p>
          )}
        </div>
      </div>

      {/* Comme sur une étiquette de rayon : le prix à gauche, l'action à droite. */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <PriceLabel value={price} />
        {item ? (
          <QuantityStepper
            label={title}
            display={productQuantityLabel(product, item.quantity)}
            isLast={item.quantity - item.step <= 0}
            onIncrement={() => onChangeQuantity(item.id, 1)}
            onDecrement={() => onChangeQuantity(item.id, -1)}
          />
        ) : (
          <button
            type="button"
            onClick={() => onAdd(product)}
            aria-label={`Ajouter ${title} à la liste`}
            className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 font-medium text-on-primary hover:opacity-90 active:scale-[0.98]"
          >
            <Plus size={18} aria-hidden />
            Ajouter
          </button>
        )}
      </div>
    </article>
  );
});
