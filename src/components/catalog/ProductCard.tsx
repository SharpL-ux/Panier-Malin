import { Leaf, Plus } from 'lucide-react';
import { memo, type CSSProperties } from 'react';
import { getCategory } from '../../data/categories';
import type { EquivalenceGroup, Product } from '../../types/catalog';
import type { ListItem } from '../../types/list';
import { productQuantityLabel, productTitle } from '../../utils/productLabels';
import { formatPack, formatRefQuantity } from '../../utils/units';
import { EnseigneBadge } from '../ui/EnseigneBadge';
import { PriceLabel, type PriceLabelValue } from '../ui/PriceLabel';
import { QuantityStepper } from '../ui/QuantityStepper';

interface Props {
  product: Product;
  group?: EquivalenceGroup;
  price: PriceLabelValue | null;
  productItem?: ListItem;
  genericItem?: ListItem;
  onAdd: (product: Product) => void;
  onAddGeneric: (product: Product) => void;
  onChangeQuantity: (itemId: string, steps: number) => void;
}

function isLastStep(item: ListItem): boolean {
  return item.quantity - item.step <= 0;
}

export const ProductCard = memo(function ProductCard({
  product,
  group,
  price,
  productItem,
  genericItem,
  onAdd,
  onAddGeneric,
  onChangeQuantity,
}: Props) {
  const category = getCategory(product.categoryId);
  const title = productTitle(product);
  const genericLabel = group?.label ?? product.name;
  const onlyOne = group === undefined || group.id.startsWith('perso-groupe-');

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
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-medium">{product.brand}</span>
            <span className="rounded-[3px] border border-line px-1 text-xs text-ink-soft tabular">
              {product.soldByWeight ? 'Au poids' : formatPack(product.pack)}
            </span>
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1 text-xs" aria-label="Caractéristiques">
            {product.brandType === 'distributeur' &&
              product.enseignes.map((e) => (
                <li key={e}>
                  <EnseigneBadge id={e} title="Marque de distributeur" />
                  <span className="sr-only">, marque de distributeur</span>
                </li>
              ))}
            {product.flags.bio && (
              <li className="inline-flex items-center gap-1 rounded-[3px] bg-cheap-bg px-1.5 py-0.5 font-semibold text-cheap">
                <Leaf size={12} aria-hidden />
                Bio
              </li>
            )}
            {product.flags.halal && (
              <li className="rounded-[3px] border border-line-strong px-1.5 py-0.5 font-semibold">
                Halal
              </li>
            )}
            {product.custom && (
              <li className="rounded-[3px] border border-dashed border-line-strong px-1.5 py-0.5 font-semibold">
                Ajouté par vous
              </li>
            )}
          </ul>
        </div>
      </div>

      <PriceLabel value={price} />

      <div className="mt-auto space-y-2">
        {productItem ? (
          <QuantityStepper
            label={title}
            display={productQuantityLabel(product, productItem.quantity)}
            isLast={isLastStep(productItem)}
            onIncrement={() => onChangeQuantity(productItem.id, 1)}
            onDecrement={() => onChangeQuantity(productItem.id, -1)}
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

        {!onlyOne &&
          (genericItem && group ? (
            <div className="flex items-center gap-2 text-sm">
              <QuantityStepper
                size="sm"
                label={`${genericLabel}, peu importe la marque`}
                display={formatRefQuantity(genericItem.quantity, group.refUnit)}
                isLast={isLastStep(genericItem)}
                onIncrement={() => onChangeQuantity(genericItem.id, 1)}
                onDecrement={() => onChangeQuantity(genericItem.id, -1)}
              />
              <span className="text-ink-soft">toutes marques</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddGeneric(product)}
              aria-label={`Ajouter ${genericLabel}, peu importe la marque`}
              className="text-sm font-medium text-ink-soft underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink"
            >
              Peu importe la marque
            </button>
          ))}
      </div>
    </article>
  );
});
