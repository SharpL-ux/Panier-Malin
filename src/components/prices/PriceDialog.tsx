import { ExternalLink } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { usePrices, useSettings } from '../../hooks/useAppContexts';
import { OPEN_PRICES_ADD_PRICE_URL } from '../../services/openPrices';
import { itemCost } from '../../services/pricing';
import { storeLabel } from '../../services/stores';
import type { Product } from '../../types/catalog';
import { formatFrDate, toIsoDate } from '../../utils/dates';
import { formatCents, parseEuroToCents } from '../../utils/money';
import { packLabel } from '../../utils/productLabels';
import { EnseigneBadge } from '../ui/EnseigneBadge';
import { Dialog } from '../ui/Dialog';

interface Props {
  product: Product;
  open: boolean;
  onClose: () => void;
  /** Magasin présélectionné (depuis le tableau du comparateur, par exemple). */
  storeId?: string;
}

/** Saisie d'un prix relevé soi-même : il reste sur l'appareil et passe avant les relevés Open Prices. */
export function PriceDialog({ product, open, onClose, storeId: initialStore }: Props) {
  const { stores, mainStoreId, enseigne } = useSettings();
  const { priceAt, manualPrice, setManualPrice, removeManualPrice } = usePrices();
  const preferred =
    initialStore ??
    stores.find((s) => enseigne !== 'all' && s.enseigne === enseigne)?.id ??
    mainStoreId ??
    stores[0]?.id;
  const [storeId, setStoreId] = useState(preferred ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [error, setError] = useState<string>();
  const ids = { store: useId(), amount: useId(), date: useId() };
  const per = product.soldByWeight ? 'kg' : 'pack';
  const pack = packLabel(product);
  const packText = product.soldByWeight ? 'au kilo' : pack === 'À la pièce' ? 'à la pièce' : pack;
  const unitHint = product.soldByWeight
    ? 'le kilo'
    : pack === 'À la pièce'
      ? 'la pièce'
      : `pour ${pack}`;

  function submit(event: FormEvent) {
    event.preventDefault();
    const cents = parseEuroToCents(amount.replace(/\s|€/g, ''));
    if (!storeId) return setError('Choisissez le magasin.');
    if (cents === null || cents <= 0) return setError('Indiquez le prix payé, par exemple 1,29.');
    setManualPrice(product.id, storeId, { cents, per, date });
    setAmount('');
    setError(undefined);
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Prix : ${product.name}`}>
      {stores.length === 0 ? (
        <div className="space-y-3">
          <p>Pour enregistrer un prix, choisissez d’abord vos magasins.</p>
          <Link
            to="/magasins"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-full bg-primary px-5 font-medium text-on-primary"
          >
            Choisir mes magasins
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <section aria-labelledby={`${ids.store}-titre`}>
            <h3 id={`${ids.store}-titre`} className="mb-2 font-medium">
              Prix connus, {packText}
            </h3>
            <ul className="divide-y divide-line rounded-md border border-line">
              {stores.map((store) => {
                const selected = priceAt(product.id, store.id);
                const cents = selected ? itemCost(product, 1, selected.observation) : null;
                const mine = manualPrice(product.id, store.id);
                return (
                  <li
                    key={store.id}
                    className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
                  >
                    {store.enseigne && <EnseigneBadge id={store.enseigne} />}
                    <span className="min-w-0 flex-1">{storeLabel(store)}</span>
                    {selected && cents !== null ? (
                      <span className="text-right">
                        <span className="font-semibold tabular">{formatCents(cents)}</span>
                        <span className="block text-xs text-ink-soft">
                          {selected.observation.source === 'manuel' ? 'votre prix' : 'Open Prices'},
                          le {formatFrDate(selected.observation.date)}
                          {selected.fallback
                            ? `, relevé chez ${selected.observation.fallbackFrom}`
                            : ''}
                          {selected.stale ? ', plus de 3 mois' : ''}
                        </span>
                      </span>
                    ) : (
                      <span className="text-ink-soft">Prix non disponible</span>
                    )}
                    {mine && (
                      <button
                        type="button"
                        onClick={() => removeManualPrice(product.id, store.id)}
                        className="h-8 rounded-full px-2 text-xs font-medium text-dear hover:bg-dear-bg"
                        aria-label={`Supprimer votre prix chez ${storeLabel(store)}`}
                      >
                        Supprimer votre prix
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <form
            onSubmit={submit}
            noValidate
            className="space-y-3 rounded-md border border-line p-3"
          >
            <h3 className="font-medium">Ajouter votre prix</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor={ids.store} className="block text-sm font-medium">
                  Magasin
                </label>
                <select
                  id={ids.store}
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="h-11 w-full rounded-md border border-line-strong bg-surface px-2"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {storeLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor={ids.amount} className="block text-sm font-medium">
                  Prix payé ({unitHint})
                </label>
                <input
                  id={ids.amount}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1,29"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${ids.amount}-erreur` : undefined}
                  className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 tabular"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor={ids.date} className="block text-sm font-medium">
                  Date du relevé
                </label>
                <input
                  id={ids.date}
                  type="date"
                  value={date}
                  max={toIsoDate(new Date())}
                  onChange={(e) => setDate(e.target.value || toIsoDate(new Date()))}
                  className="h-11 w-full rounded-md border border-line-strong bg-surface px-2"
                />
              </div>
            </div>
            {error && (
              <p id={`${ids.amount}-erreur`} className="text-sm font-medium text-dear">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="h-11 rounded-full bg-primary px-5 font-medium text-on-primary"
            >
              Enregistrer mon prix
            </button>
            <p className="text-sm text-ink-soft">
              Votre prix reste sur cet appareil et passe avant les relevés Open Prices. Pour qu’il
              profite à tous, partagez-le sur Open Prices avec une photo de l’étiquette ou du
              ticket.
            </p>
            <a
              href={OPEN_PRICES_ADD_PRICE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2"
            >
              Partager ce prix sur Open Prices
              <ExternalLink size={14} aria-hidden />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </form>
        </div>
      )}
    </Dialog>
  );
}
