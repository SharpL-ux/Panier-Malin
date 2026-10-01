import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { usePrices, useSettings, useShoppingList } from '../../hooks/useAppContexts';
import { optimalBasket, type Line } from '../../services/comparator';
import { storeLabel } from '../../services/stores';
import { formatCents, parseEuroToCents } from '../../utils/money';

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/** Panier optimal : la répartition la moins chère entre 1 à 3 magasins, applicable à la liste. */
export function OptimalBasketPanel({ lines }: { lines: Line[] }) {
  const { stores, mainStoreId, options, setOptions } = useSettings();
  const { priceAt } = usePrices();
  const { assignStores } = useShoppingList();
  const [threshold, setThreshold] = useState(euros(options.minSavingCents));
  const [applied, setApplied] = useState(false);
  const thresholdId = useId();
  const basket = useMemo(
    () =>
      optimalBasket(lines, stores, priceAt, {
        maxStores: options.maxStores,
        minSavingCents: options.minSavingCents,
        mainStoreId,
      }),
    [lines, stores, priceAt, options.maxStores, options.minSavingCents, mainStoreId],
  );
  if (!basket) return null;
  const byId = new Map(stores.map((s) => [s.id, s]));
  const label = (id: string) => {
    const store = byId.get(id);
    return store ? storeLabel(store) : id;
  };
  const nameOf = new Map(lines.map((l) => [l.item.id, l.product.name]));
  const commit = () => {
    const cents = parseEuroToCents(threshold.replace(/\s|€/g, ''));
    if (cents !== null && cents >= 0) {
      setOptions({ minSavingCents: cents });
      setThreshold(euros(cents));
    } else setThreshold(euros(options.minSavingCents));
  };
  const verifyStore = basket.toVerify[0] ? basket.assignments[basket.toVerify[0]] : undefined;

  return (
    <section
      aria-labelledby="panier-optimal"
      className="space-y-4 rounded-md border border-line bg-surface p-4"
    >
      <div>
        <h2 id="panier-optimal" className="font-display text-xl font-bold">
          Panier optimal
        </h2>
        <p className="text-sm text-ink-soft">
          La répartition la moins chère de la liste entre vos magasins, sans multiplier les
          déplacements.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Magasins au plus</legend>
          <div className="flex gap-1">
            {([1, 2, 3] as const).map((n) => (
              <label
                key={n}
                className="grid size-10 cursor-pointer place-items-center rounded-full border border-line-strong font-medium has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
              >
                <input
                  type="radio"
                  name="magasins-max"
                  className="sr-only"
                  checked={options.maxStores === n}
                  disabled={n > Math.max(1, stores.length)}
                  onChange={() => setOptions({ maxStores: n })}
                  aria-label={`${n} ${n > 1 ? 'magasins' : 'magasin'} au plus`}
                />
                {n}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1">
          <label htmlFor={thresholdId} className="block text-sm font-medium">
            Économie minimale pour un magasin de plus (€)
          </label>
          <input
            id={thresholdId}
            inputMode="decimal"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
            }}
            className="h-10 w-28 rounded-md border border-line-strong bg-surface px-3 tabular"
          />
        </div>
      </div>

      <div aria-live="polite" className="space-y-2">
        <p className="text-lg">
          <span className="font-semibold">{basket.storeIds.map(label).join(' + ')}</span> :{' '}
          {formatCents(basket.totalCents)}
          {basket.coveredCount < lines.length
            ? ` pour ${basket.coveredCount} articles sur ${lines.length}`
            : ''}
        </p>
        {basket.storeIds.length > 1 && basket.savingsCents > 0 && (
          <p>
            Soit {formatCents(basket.savingsCents)} de moins qu’en allant seulement chez{' '}
            {label(basket.singleStoreId)}.
          </p>
        )}
        {basket.storeIds.length === 1 && options.maxStores > 1 && stores.length > 1 && (
          <p className="text-sm text-ink-soft">
            Un seul magasin suffit : un magasin de plus ferait économiser moins de{' '}
            {formatCents(options.minSavingCents)}.
          </p>
        )}
        {basket.perStore.length > 1 && (
          <ul className="space-y-1 text-sm">
            {basket.perStore.map((p) => (
              <li key={p.storeId}>
                <span className="font-medium">{label(p.storeId)}</span> ({formatCents(p.totalCents)}
                ) : {p.itemIds.map((id) => nameOf.get(id)).join(', ')}
              </li>
            ))}
          </ul>
        )}
        {basket.toVerify.length > 0 && verifyStore && (
          <p className="text-sm">
            À vérifier en magasin, faute de prix :{' '}
            {basket.toVerify.map((id) => nameOf.get(id)).join(', ')}.{' '}
            {basket.toVerify.length > 1 ? 'Ils sont placés' : 'Il est placé'} chez{' '}
            {label(verifyStore)}.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              assignStores(basket.assignments);
              setApplied(true);
            }}
            className="h-11 rounded-full bg-primary px-5 font-medium text-on-primary"
          >
            Appliquer à ma liste
          </button>
          {applied && (
            <p role="status" className="text-sm">
              Liste répartie par magasin.{' '}
              <Link to="/liste" className="font-medium underline underline-offset-2">
                Voir ma liste
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
