import { X } from 'lucide-react';
import { Link } from 'react-router';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { CATEGORIES } from '../data/categories';
import { useCatalog, useShoppingList } from '../hooks/useAppContexts';
import type { ListItem } from '../types/list';
import { productQuantityLabel } from '../utils/productLabels';
import { formatPack, formatRefQuantity } from '../utils/units';

/**
 * Version minimale de la liste (étape 1) : articles regroupés par rayon, quantités et suppression.
 * L'étape 2 ajoutera le nom modifiable, les notes, les cases à cocher, l'historique et les favoris.
 */
export function ListPage() {
  const { list, changeQuantity, removeItem } = useShoppingList();
  const { catalog } = useCatalog();

  const describe = (item: ListItem) => {
    if (item.target.kind === 'produit') {
      const product = catalog.productById.get(item.target.productId);
      if (!product)
        return {
          title: 'Produit introuvable',
          detail: 'Il a peut-être été retiré du catalogue.',
          icon: '❔',
          qty: String(item.quantity),
        };
      return {
        title: product.name,
        detail: product.soldByWeight
          ? `${product.brand}, au poids`
          : `${product.brand}, ${formatPack(product.pack)}`,
        icon: product.icon,
        qty: productQuantityLabel(product, item.quantity),
      };
    }
    const group = catalog.groupById.get(item.target.groupId);
    return {
      title: group?.label ?? 'Groupe introuvable',
      detail: 'Peu importe la marque',
      icon: CATEGORIES.find((c) => c.id === item.categoryId)?.icon ?? '🛒',
      qty: group ? formatRefQuantity(item.quantity, group.refUnit) : String(item.quantity),
    };
  };

  const byAisle = CATEGORIES.map((category) => ({
    category,
    items: list.items.filter((i) => i.categoryId === category.id),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-28 lg:pb-12">
      <h1 className="font-display text-3xl font-bold">{list.name}</h1>
      <p className="mt-1 text-ink-soft tabular">
        {list.items.length} {list.items.length > 1 ? 'articles' : 'article'}, classés dans l’ordre
        des rayons
      </p>

      {byAisle.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-line-strong bg-surface p-6 text-center">
          <p className="font-medium">Votre liste est vide.</p>
          <p className="mt-1 text-ink-soft">Ajoutez des produits depuis le catalogue.</p>
          <Link
            to="/"
            className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-5 font-medium text-on-primary"
          >
            Ouvrir le catalogue
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {byAisle.map(({ category, items }) => (
            <section key={category.id} aria-labelledby={`rayon-${category.id}`}>
              <h2
                id={`rayon-${category.id}`}
                className="mb-2 flex items-center gap-2 font-display text-xl font-bold"
              >
                <span aria-hidden>{category.icon}</span>
                {category.label}
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                {items.map((item) => {
                  const d = describe(item);
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span aria-hidden className="text-xl">
                        {d.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{d.title}</p>
                        <p className="truncate text-sm text-ink-soft">{d.detail}</p>
                      </div>
                      <QuantityStepper
                        size="sm"
                        label={d.title}
                        display={d.qty}
                        isLast={item.quantity - item.step <= 0}
                        onIncrement={() => changeQuantity(item.id, 1)}
                        onDecrement={() => changeQuantity(item.id, -1)}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Supprimer ${d.title} de la liste`}
                        className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink"
                      >
                        <X size={18} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
