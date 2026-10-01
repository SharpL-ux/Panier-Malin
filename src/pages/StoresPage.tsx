import { LocateFixed, Search, Trash2 } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { EnseigneBadge } from '../components/ui/EnseigneBadge';
import { ENSEIGNES, isEnseigneId } from '../data/enseignes';
import { useSettings } from '../hooks/useAppContexts';
import { nearbyLocations, OpenPricesError, searchLocations } from '../services/openPrices';
import { MAX_STORES, storeLabel } from '../services/stores';
import type { EnseigneId } from '../types/catalog';
import type { Store } from '../types/stores';
import { createId } from '../utils/ids';

type Search =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; results: Store[]; label: string }
  | { state: 'error'; message: string };

const button = 'flex h-11 shrink-0 items-center gap-2 rounded-full px-4 font-medium';

function StoreLine({ store }: { store: Store }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex flex-wrap items-center gap-2 font-medium">
        {store.enseigne ? (
          <EnseigneBadge id={store.enseigne} />
        ) : (
          <span className="text-xs text-ink-soft">Enseigne inconnue</span>
        )}
        {store.name}
      </p>
      <p className="text-sm text-ink-soft">{store.address || store.city || 'Adresse inconnue'}</p>
      {store.priceCount !== undefined && (
        <p className="text-xs text-ink-soft tabular">
          {store.priceCount} prix relevés sur Open Prices
        </p>
      )}
    </div>
  );
}

export function StoresPage() {
  const { stores, mainStoreId, addStore, removeStore, setMainStore, options, setOptions } =
    useSettings();
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState<Search>({ state: 'idle' });
  const [manual, setManual] = useState({ name: '', enseigne: '' as EnseigneId | '', city: '' });
  const abort = useRef<AbortController | null>(null);
  const ids = { term: useId(), name: useId(), enseigne: useId(), city: useId(), fallback: useId() };
  const full = stores.length >= MAX_STORES;

  async function run(label: string, load: (signal: AbortSignal) => Promise<Store[]>) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setSearch({ state: 'loading' });
    try {
      const results = await load(controller.signal);
      setSearch({ state: 'done', results, label });
    } catch (error) {
      if (controller.signal.aborted) return;
      setSearch({
        state: 'error',
        message:
          error instanceof OpenPricesError
            ? error.message
            : 'La recherche a échoué. Réessayez plus tard.',
      });
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (term.trim().length < 2)
      return setSearch({ state: 'error', message: 'Saisissez au moins deux lettres.' });
    void run(`pour « ${term.trim()} »`, (signal) => searchLocations(term, signal));
  }

  function aroundMe() {
    if (!('geolocation' in navigator)) {
      setSearch({ state: 'error', message: 'Votre navigateur ne permet pas la géolocalisation.' });
      return;
    }
    setSearch({ state: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        void run('autour de vous', (signal) =>
          nearbyLocations(pos.coords.latitude, pos.coords.longitude, 3, signal),
        ),
      () =>
        setSearch({
          state: 'error',
          message: 'Position introuvable : autorisez la géolocalisation ou cherchez par ville.',
        }),
      { timeout: 10000 },
    );
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    if (!manual.name.trim()) return;
    addStore({
      id: createId('perso'),
      name: manual.name.trim(),
      enseigne: manual.enseigne || null,
      address: manual.city.trim(),
      city: manual.city.trim(),
    });
    setManual({ name: '', enseigne: '', city: '' });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-6 pb-28 lg:pb-12">
      <div>
        <h1 className="font-display text-3xl font-bold">Mes magasins</h1>
        <p className="mt-1 text-ink-soft">
          Choisissez jusqu’à {MAX_STORES} magasins précis : les prix sont comparés entre eux.
        </p>
      </div>

      <section aria-labelledby="mes-magasins">
        <h2 id="mes-magasins" className="mb-2 font-display text-xl font-bold tabular">
          Magasins choisis ({stores.length}/{MAX_STORES})
        </h2>
        {stores.length === 0 ? (
          <p className="rounded-md border border-dashed border-line-strong bg-surface p-4 text-ink-soft">
            Aucun magasin pour l’instant. Cherchez-les ci-dessous par ville ou par nom.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {stores.map((store) => (
              <li key={store.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <StoreLine store={store} />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="magasin-principal"
                    checked={mainStoreId === store.id}
                    onChange={() => setMainStore(store.id)}
                    className="size-5 accent-[var(--primary)]"
                  />
                  Magasin principal
                </label>
                <button
                  type="button"
                  onClick={() => removeStore(store.id)}
                  aria-label={`Retirer ${storeLabel(store)}`}
                  className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-dear"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-ink-soft">
          Le magasin principal reçoit les articles dont le prix est inconnu ailleurs.
        </p>
      </section>

      <section aria-labelledby="ajouter-magasin" className="space-y-3">
        <h2 id="ajouter-magasin" className="font-display text-xl font-bold">
          Ajouter un magasin
        </h2>
        <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
          <label htmlFor={ids.term} className="sr-only">
            Ville ou nom du magasin
          </label>
          <input
            id={ids.term}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Ville ou nom : Courbevoie, Lidl…"
            className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4"
          />
          <button type="submit" className={`${button} bg-primary text-on-primary`}>
            <Search size={18} aria-hidden />
            Rechercher
          </button>
          <button
            type="button"
            onClick={aroundMe}
            className={`${button} border border-line-strong bg-surface`}
          >
            <LocateFixed size={18} aria-hidden />
            Autour de moi
          </button>
        </form>

        <div aria-live="polite">
          {search.state === 'loading' && (
            <p className="text-ink-soft">Recherche sur Open Prices…</p>
          )}
          {search.state === 'error' && <p className="font-medium text-dear">{search.message}</p>}
          {search.state === 'done' &&
            (search.results.length === 0 ? (
              <p className="text-ink-soft">
                Aucun magasin trouvé {search.label}. Essayez la ville voisine, ou ajoutez-le à la
                main.
              </p>
            ) : (
              <>
                <p className="mb-2 text-sm text-ink-soft">
                  {search.results.length} magasins trouvés {search.label}
                </p>
                <ul className="divide-y divide-line rounded-md border border-line bg-surface">
                  {search.results.map((store) => {
                    const added = stores.some((s) => s.id === store.id);
                    return (
                      <li key={store.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                        <StoreLine store={store} />
                        <button
                          type="button"
                          disabled={added || full}
                          onClick={() => addStore(store)}
                          aria-label={
                            added
                              ? `${storeLabel(store)} déjà ajouté`
                              : `Ajouter ${storeLabel(store)}`
                          }
                          className="h-10 rounded-full border border-line-strong px-4 text-sm font-medium hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {added ? 'Ajouté' : 'Ajouter'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ))}
        </div>

        <details className="rounded-md border border-line bg-surface p-3">
          <summary className="cursor-pointer font-medium">
            Mon magasin n’est pas sur Open Prices
          </summary>
          <form onSubmit={submitManual} className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
            <div className="space-y-1">
              <label htmlFor={ids.name} className="block text-sm font-medium">
                Nom du magasin
              </label>
              <input
                id={ids.name}
                value={manual.name}
                onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                className="h-11 w-full rounded-md border border-line-strong bg-surface px-3"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={ids.enseigne} className="block text-sm font-medium">
                Enseigne
              </label>
              <select
                id={ids.enseigne}
                value={manual.enseigne}
                onChange={(e) =>
                  setManual((m) => ({
                    ...m,
                    enseigne: isEnseigneId(e.target.value) ? e.target.value : '',
                  }))
                }
                className="h-11 w-full rounded-md border border-line-strong bg-surface px-2"
              >
                <option value="">Autre</option>
                {ENSEIGNES.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor={ids.city} className="block text-sm font-medium">
                Ville
              </label>
              <input
                id={ids.city}
                value={manual.city}
                onChange={(e) => setManual((m) => ({ ...m, city: e.target.value }))}
                className="h-11 w-full rounded-md border border-line-strong bg-surface px-3"
              />
            </div>
            <button
              type="submit"
              disabled={full}
              className="h-11 rounded-full bg-primary px-5 font-medium text-on-primary disabled:opacity-60 sm:col-span-3 sm:w-fit"
            >
              Ajouter ce magasin
            </button>
            <p className="text-sm text-ink-soft sm:col-span-3">
              Ses prix viendront de vos saisies. Vous pouvez aussi l’ajouter à Open Prices pour que
              d’autres en profitent.
            </p>
          </form>
        </details>
      </section>

      <section aria-labelledby="options" className="space-y-2">
        <h2 id="options" className="font-display text-xl font-bold">
          Options de comparaison
        </h2>
        <label htmlFor={ids.fallback} className="flex items-start gap-3">
          <input
            id={ids.fallback}
            type="checkbox"
            checked={options.sameEnseigneFallback}
            onChange={(e) => setOptions({ sameEnseigneFallback: e.target.checked })}
            className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
          />
          <span>
            Utiliser le prix relevé dans un autre magasin de la même enseigne quand le mien n’en a
            pas
            <span className="block text-sm text-ink-soft">
              Ces prix sont toujours signalés comme tels.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}
