import { FileDown, History, Pencil, Star } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ExportDialog } from '../components/list/ExportDialog';
import { HistoryDialog } from '../components/list/HistoryDialog';
import { ListItemRow, type ItemDescription } from '../components/list/ListItemRow';
import { ListSummaryBar } from '../components/list/ListSummaryBar';
import { CATEGORIES } from '../data/categories';
import { getEnseigne } from '../data/enseignes';
import { useCatalog, useSettings, useShoppingList } from '../hooks/useAppContexts';
import { useComparison } from '../hooks/useComparison';
import type { Cell } from '../services/comparator';
import { formatCents } from '../utils/money';
import { referenceAt } from '../services/catalog';
import { storeLabel } from '../services/stores';
import type { ListItem } from '../types/list';
import { formatFrDate, mondayOf } from '../utils/dates';
import { packLabel, productQuantityLabel } from '../utils/productLabels';

type Grouping = 'rayon' | 'magasin';

const toolButton =
  'flex h-10 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50';

function TitleEditor({
  name,
  onSave,
  onCancel,
}: {
  name: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(name);
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(value);
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={id} className="block text-sm font-medium">
          Nom de la liste
        </label>
        <input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-lg"
        />
      </div>
      <button
        type="submit"
        className="h-11 rounded-full bg-primary px-4 font-medium text-on-primary"
      >
        Enregistrer
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-11 rounded-full px-4 font-medium hover:bg-surface-2"
      >
        Annuler
      </button>
    </form>
  );
}

export function ListPage() {
  const shopping = useShoppingList();
  const { list } = shopping;
  const { catalog, favorites } = useCatalog();
  const { enseigne, stores } = useSettings();
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [grouping, setGrouping] = useState<Grouping>('rayon');
  const { lines: pricedLines, comparison } = useComparison('complet');
  const rowByItem = new Map(pricedLines.map((l, r) => [l.item.id, r]));

  /** Prix d'un article : dans son magasin s'il est affecté, sinon le plus bas connu. */
  const cellFor = (item: ListItem): Cell | null => {
    const r = rowByItem.get(item.id);
    const row = r === undefined ? [] : (comparison.matrix[r] ?? []);
    const index = item.assignedStoreId
      ? stores.findIndex((s) => s.id === item.assignedStoreId)
      : -1;
    if (index >= 0) return row[index] ?? null;
    return row.reduce<Cell | null>(
      (best, c) => (c && (!best || c.cents < best.cents) ? c : best),
      null,
    );
  };

  const storeById = new Map(stores.map((s) => [s.id, s]));
  const hasAssignments = list.items.some(
    (i) => i.assignedStoreId && storeById.has(i.assignedStoreId),
  );
  const effectiveGrouping: Grouping = hasAssignments ? grouping : 'rayon';
  const isOldWeek = list.weekOf < mondayOf(new Date());
  const favoriteProducts = [...favorites].flatMap((id) => catalog.productById.get(id) ?? []);
  const missingFavorites = favoriteProducts.filter(
    (p) => !list.items.some((i) => i.productId === p.id),
  );
  const checkedCount = list.items.filter((i) => i.checked).length;

  const describe = (item: ListItem): ItemDescription => {
    const product = catalog.productById.get(item.productId);
    if (!product) {
      return {
        title: 'Produit introuvable',
        detail: 'Il a peut-être été retiré du catalogue.',
        icon: '❔',
        quantity: String(item.quantity),
      };
    }
    const assigned = item.assignedStoreId ? storeById.get(item.assignedStoreId) : undefined;
    const target = assigned?.enseigne ?? (enseigne === 'all' ? null : enseigne);
    const reference = target ? referenceAt(product, target) : undefined;
    const where = reference
      ? `, ${reference.brand} chez ${getEnseigne(reference.enseigne).label}`
      : '';
    const brand = product.brand ? `${product.brand}, ` : '';
    return {
      title: product.name,
      detail: `${brand}${packLabel(product)}${where}`,
      icon: product.icon,
      quantity: productQuantityLabel(product, item.quantity),
      price: (() => {
        const cell = cellFor(item);
        return cell ? formatCents(cell.cents) : undefined;
      })(),
    };
  };

  const sections =
    effectiveGrouping === 'rayon'
      ? CATEGORIES.map((c) => ({
          key: c.id,
          title: c.label,
          icon: c.icon,
          items: list.items.filter((i) => i.categoryId === c.id),
        }))
      : [
          ...stores.map((s) => ({
            key: s.id,
            title: storeLabel(s),
            icon: '🏪',
            items: list.items.filter((i) => i.assignedStoreId === s.id),
          })),
          {
            key: 'sans-magasin',
            title: 'Sans magasin',
            icon: '🛒',
            items: list.items.filter(
              (i) => !i.assignedStoreId || !storeById.has(i.assignedStoreId),
            ),
          },
        ];
  const visibleSections = sections.filter((s) => s.items.length > 0);
  const aisleRank = new Map(CATEGORIES.map((c) => [c.id, c.aisleOrder]));
  const byAisle = (a: ListItem, b: ListItem) =>
    (aisleRank.get(a.categoryId) ?? 0) - (aisleRank.get(b.categoryId) ?? 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-44 lg:pb-28">
      {isOldWeek && (
        <div
          className="mb-5 rounded-md border border-line-strong bg-surface p-4 print:hidden"
          role="status"
        >
          <p className="font-medium">Une nouvelle semaine a commencé.</p>
          <p className="mt-1 text-sm text-ink-soft">
            Cette liste date de la semaine du {formatFrDate(list.weekOf)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {list.items.length > 0 && (
              <button
                type="button"
                onClick={() => shopping.startNewList(list.id)}
                className="h-10 rounded-full bg-primary px-4 text-sm font-medium text-on-primary"
              >
                Reprendre cette liste pour cette semaine
              </button>
            )}
            <button type="button" onClick={() => shopping.startNewList()} className={toolButton}>
              Commencer une liste vide
            </button>
          </div>
        </div>
      )}

      {editing ? (
        <TitleEditor
          name={list.name}
          onSave={(name) => {
            shopping.renameList(name);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-start gap-2">
          <h1 className="flex-1 font-display text-3xl font-bold">{list.name}</h1>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Renommer la liste"
            className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-2 print:hidden"
          >
            <Pencil size={18} aria-hidden />
          </button>
        </div>
      )}
      <p className="mt-1 text-ink-soft">
        {effectiveGrouping === 'rayon' ? 'Classée dans l’ordre des rayons' : 'Classée par magasin'}
      </p>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 print:hidden">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className={`${toolButton} shrink-0`}
        >
          <History size={16} aria-hidden />
          Mes listes
        </button>
        <button
          type="button"
          onClick={() => shopping.addProducts(missingFavorites)}
          disabled={missingFavorites.length === 0}
          className={`${toolButton} shrink-0`}
        >
          <Star size={16} aria-hidden />
          {missingFavorites.length > 0
            ? `Ajouter mes favoris (${missingFavorites.length})`
            : 'Favoris déjà ajoutés'}
        </button>
        <button
          type="button"
          onClick={shopping.uncheckAll}
          disabled={checkedCount === 0}
          className={`${toolButton} shrink-0`}
        >
          Tout décocher
        </button>
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          disabled={list.items.length === 0}
          className={`${toolButton} shrink-0`}
        >
          <FileDown size={16} aria-hidden />
          Exporter en PDF
        </button>
        {hasAssignments && (
          <div
            role="group"
            aria-label="Classer la liste"
            className="flex shrink-0 rounded-full border border-line-strong p-0.5"
          >
            {(['rayon', 'magasin'] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={grouping === g}
                onClick={() => setGrouping(g)}
                className="h-9 rounded-full px-3 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-on-primary"
              >
                {g === 'rayon' ? 'Par rayon' : 'Par magasin'}
              </button>
            ))}
          </div>
        )}
      </div>

      {visibleSections.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-line-strong bg-surface p-6 text-center">
          <p className="font-medium">Votre liste est vide.</p>
          <p className="mt-1 text-ink-soft">
            Ajoutez des produits depuis le catalogue, ou reprenez vos favoris.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-5 font-medium text-on-primary"
          >
            Ouvrir le catalogue
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {visibleSections.map((section) => (
            <section key={section.key} aria-labelledby={`section-${section.key}`}>
              <h2
                id={`section-${section.key}`}
                className="mb-2 flex items-center gap-2 font-display text-xl font-bold"
              >
                <span aria-hidden>{section.icon}</span>
                {section.title}
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                {[...section.items]
                  .sort(effectiveGrouping === 'magasin' ? byAisle : () => 0)
                  .map((item) => (
                    <ListItemRow
                      key={item.id}
                      item={item}
                      description={describe(item)}
                      stores={stores}
                      onToggle={() => shopping.toggleChecked(item.id)}
                      onChangeQuantity={(steps) => shopping.changeQuantity(item.id, steps)}
                      onNote={(note) => shopping.setNote(item.id, note)}
                      onAssign={(storeId) => shopping.assignStores({ [item.id]: storeId })}
                      onRemove={() => shopping.removeItem(item.id)}
                    />
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ListSummaryBar itemCount={list.items.length} checkedCount={checkedCount}>
        {(() => {
          const link = 'font-medium underline decoration-line-strong underline-offset-2';
          if (stores.length === 0) {
            return (
              <Link to="/magasins" className={link}>
                Choisir mes magasins pour voir les prix
              </Link>
            );
          }
          if (hasAssignments) {
            const assigned = list.items.filter(
              (i) => i.assignedStoreId && storeById.has(i.assignedStoreId),
            );
            const total = assigned.reduce((sum, i) => sum + (cellFor(i)?.cents ?? 0), 0);
            const count = new Set(assigned.map((i) => i.assignedStoreId)).size;
            return (
              <Link to="/comparer" className={link}>
                Panier réparti : {formatCents(total)} dans {count}{' '}
                {count > 1 ? 'magasins' : 'magasin'}
              </Link>
            );
          }
          const best = comparison.totals.find((t) => t.storeId === comparison.cheapestStoreId);
          const bestStore = best ? storeById.get(best.storeId) : undefined;
          if (best && bestStore) {
            const lead = comparison.mostExpensiveStoreId ? 'Moins cher chez' : 'Total estimé chez';
            return (
              <Link to="/comparer" className={link}>
                {lead} {storeLabel(bestStore)} : {formatCents(best.totalCents)} ({best.pricedCount}/
                {comparison.itemCount} articles avec prix)
              </Link>
            );
          }
          return (
            <Link to="/comparer" className={link}>
              Comparer les prix
            </Link>
          );
        })()}
      </ListSummaryBar>
      <HistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
      {exportOpen && <ExportDialog open onClose={() => setExportOpen(false)} />}
    </div>
  );
}
