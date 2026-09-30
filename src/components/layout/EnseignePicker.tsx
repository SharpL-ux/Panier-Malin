import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { ENSEIGNES, isEnseigneId } from '../../data/enseignes';
import { useSettings } from '../../hooks/useAppContexts';

/** Choix de l'enseigne : filtre le catalogue (et, plus tard, les prix affichés). */
export function EnseignePicker() {
  const { enseigne, setEnseigne } = useSettings();
  const id = useId();
  const selected = ENSEIGNES.find((e) => e.id === enseigne);
  return (
    <div className="relative flex items-center">
      <label htmlFor={id} className="sr-only">
        Mon magasin
      </label>
      {selected && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-2.5 size-3 rounded-full border border-line-strong"
          style={{ background: selected.badgeBg }}
        />
      )}
      <select
        id={id}
        value={enseigne}
        onChange={(e) => setEnseigne(isEnseigneId(e.target.value) ? e.target.value : 'all')}
        className={`h-10 appearance-none rounded-full border border-line-strong bg-surface pr-8 text-sm font-medium ${selected ? 'pl-7' : 'pl-3.5'}`}
      >
        <option value="all">Tous les magasins</option>
        {ENSEIGNES.map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-2.5 text-ink-soft"
      />
    </div>
  );
}
