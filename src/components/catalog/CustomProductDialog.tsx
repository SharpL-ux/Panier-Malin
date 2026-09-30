import { LoaderCircle, ScanBarcode } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CATEGORIES, getCategory, isCategoryId } from '../../data/categories';
import { useCatalog, useShoppingList } from '../../hooks/useAppContexts';
import { fetchOffProduct, OffLookupError } from '../../services/openFoodFacts';
import type { CategoryId, PackUnit, Product } from '../../types/catalog';
import { cleanEan, isValidEan } from '../../utils/ean';
import { createId } from '../../utils/ids';
import { slugify } from '../../utils/text';
import { Dialog } from '../ui/Dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  initialCategory?: CategoryId;
}

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'found'; name: string }
  | { state: 'missing' }
  | { state: 'error'; message: string };

const input =
  'h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base aria-[invalid=true]:border-dear';
const checkbox = 'size-5 accent-[var(--primary)]';

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-dear">
          {error}
        </p>
      )}
    </div>
  );
}

export function CustomProductDialog(props: Props) {
  return (
    <Dialog open={props.open} onClose={props.onClose} title="Ajouter un produit">
      <CustomProductForm {...props} />
    </Dialog>
  );
}

function CustomProductForm({ onClose, initialName = '', initialCategory }: Props) {
  const { addCustomProduct } = useCatalog();
  const { addProduct } = useShoppingList();
  const ids = {
    ean: useId(),
    name: useId(),
    brand: useId(),
    category: useId(),
    count: useId(),
    size: useId(),
    unit: useId(),
  };

  const [ean, setEan] = useState('');
  const [name, setName] = useState(initialName);
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>(initialCategory ?? 'epicerie-salee');
  const [count, setCount] = useState('1');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState<PackUnit>('g');
  const [soldByWeight, setSoldByWeight] = useState(false);
  const [halal, setHalal] = useState(false);
  const [alsoAddToList, setAlsoAddToList] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>();
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const [submitted, setSubmitted] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const errors = {
    ean:
      ean && !isValidEan(ean)
        ? 'Ce code-barres ne semble pas valide : vérifiez les 8 ou 13 chiffres.'
        : undefined,
    name: !name.trim() ? 'Indiquez le nom du produit.' : undefined,
    size:
      !soldByWeight && !(Number(size.replace(',', '.')) > 0)
        ? 'Indiquez la contenance, par exemple 500 (g) ou 1000 (ml).'
        : undefined,
    count:
      !soldByWeight && !(Number.isInteger(Number(count)) && Number(count) >= 1)
        ? 'Nombre entier, 1 au minimum.'
        : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function searchOff() {
    if (!isValidEan(ean)) {
      setLookup({
        state: 'error',
        message: 'Saisissez un code-barres valide avant de lancer la recherche.',
      });
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLookup({ state: 'loading' });
    try {
      const info = await fetchOffProduct(ean, { signal: controller.signal });
      if (!info) {
        setLookup({ state: 'missing' });
        return;
      }
      if (info.name) setName(info.name);
      if (info.brand) setBrand(info.brand);
      if (info.pack) {
        setSoldByWeight(false);
        setCount(String(info.pack.count));
        setSize(String(info.pack.size));
        setUnit(info.pack.unit);
      }
      setImageUrl(info.imageUrl);
      setLookup({ state: 'found', name: info.name || 'produit sans nom' });
    } catch (error) {
      if (controller.signal.aborted) return;
      setLookup({
        state: 'error',
        message:
          error instanceof OffLookupError
            ? error.message
            : 'La recherche a échoué. Réessayez plus tard.',
      });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;

    const cleanBrand = brand.trim();
    const product: Product = {
      id: `perso-${slugify(name).slice(0, 40) || 'produit'}-${createId().slice(0, 8)}`,
      name: name.trim(),
      categoryId,
      icon: getCategory(categoryId).icon,
      pack: soldByWeight
        ? { count: 1, size: 1000, unit: 'g' }
        : { count: Number(count), size: Number(size.replace(',', '.')), unit },
      soldByWeight,
      halal,
      references: [],
      ...(cleanBrand ? { brand: cleanBrand } : {}),
      ...(ean ? { ean: cleanEan(ean) } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      custom: true,
    };
    addCustomProduct(product);
    if (alsoAddToList) addProduct(product);
    onClose();
  }

  const describedBy = (key: keyof typeof errors, id: string) =>
    submitted && errors[key] ? `${id}-error` : undefined;
  const invalid = (key: keyof typeof errors) =>
    (submitted || key === 'ean') && Boolean(errors[key]);

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset className="space-y-2 rounded-md border border-line p-3">
        <legend className="px-1 font-medium">Code-barres (facultatif)</legend>
        <p className="text-sm text-ink-soft">
          Pour un produit précis : le code-barres permet de récupérer son nom, sa marque et sa photo
          sur Open Food Facts, puis ses prix sur Open Prices dans tous les magasins.
        </p>
        <div className="flex gap-2">
          <label htmlFor={ids.ean} className="sr-only">
            Code-barres
          </label>
          <input
            id={ids.ean}
            inputMode="numeric"
            autoComplete="off"
            value={ean}
            onChange={(e) => {
              setEan(e.target.value);
              setLookup({ state: 'idle' });
            }}
            aria-invalid={invalid('ean')}
            aria-describedby={errors.ean ? `${ids.ean}-error` : undefined}
            placeholder="8 ou 13 chiffres"
            className={`${input} tabular`}
          />
          <button
            type="button"
            onClick={searchOff}
            disabled={lookup.state === 'loading'}
            className="flex h-11 shrink-0 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 font-medium hover:bg-surface-2 disabled:opacity-60"
          >
            {lookup.state === 'loading' ? (
              <LoaderCircle size={18} aria-hidden className="animate-spin" />
            ) : (
              <ScanBarcode size={18} aria-hidden />
            )}
            Rechercher
          </button>
        </div>
        {errors.ean && (
          <p id={`${ids.ean}-error`} className="text-sm font-medium text-dear">
            {errors.ean}
          </p>
        )}
        <p aria-live="polite" className="text-sm">
          {lookup.state === 'loading' && 'Recherche sur Open Food Facts…'}
          {lookup.state === 'found' &&
            `Trouvé : ${lookup.name}. Vérifiez les champs préremplis ci-dessous.`}
          {lookup.state === 'missing' &&
            'Ce code-barres n’est pas encore dans Open Food Facts. Complétez les champs ci-dessous.'}
          {lookup.state === 'error' && (
            <span className="font-medium text-dear">{lookup.message}</span>
          )}
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ids.name} label="Nom du produit" error={submitted ? errors.name : undefined}>
          <input
            id={ids.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={invalid('name')}
            aria-describedby={describedBy('name', ids.name)}
            className={input}
          />
        </Field>
        <Field
          id={ids.brand}
          label="Marque"
          hint="Facultative : laissez vide pour un produit générique."
        >
          <input
            id={ids.brand}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-describedby={`${ids.brand}-hint`}
            className={input}
          />
        </Field>
        <Field id={ids.category} label="Rayon">
          <select
            id={ids.category}
            value={categoryId}
            onChange={(e) => {
              if (isCategoryId(e.target.value)) setCategoryId(e.target.value);
            }}
            className={input}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-medium">Format</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={soldByWeight}
            onChange={(e) => setSoldByWeight(e.target.checked)}
            className={checkbox}
          />
          Vendu au poids (prix au kilo)
        </label>
        {!soldByWeight && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-20 space-y-1">
              <label htmlFor={ids.count} className="block text-sm">
                Nombre
              </label>
              <input
                id={ids.count}
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                aria-invalid={invalid('count')}
                aria-describedby={describedBy('count', ids.count)}
                className={`${input} tabular`}
              />
            </div>
            <span className="pb-2.5 text-ink-soft" aria-hidden>
              ×
            </span>
            <div className="w-28 space-y-1">
              <label htmlFor={ids.size} className="block text-sm">
                Contenance
              </label>
              <input
                id={ids.size}
                inputMode="decimal"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                aria-invalid={invalid('size')}
                aria-describedby={describedBy('size', ids.size)}
                className={`${input} tabular`}
              />
            </div>
            <div className="w-32 space-y-1">
              <label htmlFor={ids.unit} className="block text-sm">
                Unité
              </label>
              <select
                id={ids.unit}
                value={unit}
                onChange={(e) => setUnit(e.target.value as PackUnit)}
                className={input}
              >
                <option value="g">grammes</option>
                <option value="ml">millilitres</option>
                <option value="piece">pièces</option>
              </select>
            </div>
          </div>
        )}
        {submitted && (errors.count || errors.size) && (
          <p
            id={`${errors.size ? ids.size : ids.count}-error`}
            className="text-sm font-medium text-dear"
          >
            {errors.size ?? errors.count}
          </p>
        )}
      </fieldset>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={halal}
          onChange={(e) => setHalal(e.target.checked)}
          className={checkbox}
        />
        Viande, volaille ou charcuterie certifiée halal
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={alsoAddToList}
            onChange={(e) => setAlsoAddToList(e.target.checked)}
            className={checkbox}
          />
          Ajouter aussi à ma liste
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full px-4 font-medium hover:bg-surface-2"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="h-11 rounded-full bg-primary px-5 font-medium text-on-primary hover:opacity-90"
          >
            Créer le produit
          </button>
        </div>
      </div>
    </form>
  );
}
