import { useEffect, useRef, type CSSProperties } from 'react';
import { CATEGORIES } from '../../data/categories';
import type { CategoryId } from '../../types/catalog';

interface Props {
  selected: CategoryId | 'all';
  counts: Map<CategoryId, number>;
  total: number;
  onSelect: (id: CategoryId | 'all') => void;
}

/**
 * Rayons du magasin : bandeau défilant sur mobile, colonne latérale sur grand écran.
 * Les compteurs tiennent compte de la recherche et des filtres en cours.
 */
export function CategoryNav({ selected, counts, total, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Sur mobile, l'onglet choisi peut être hors du bandeau défilant.
    activeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selected]);
  const items: {
    id: CategoryId | 'all';
    label: string;
    icon: string;
    color: string;
    count: number;
  }[] = [
    { id: 'all', label: 'Tous les rayons', icon: '🛒', color: '#6b7a86', count: total },
    ...CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      color: c.color,
      count: counts.get(c.id) ?? 0,
    })),
  ];
  return (
    <nav aria-label="Rayons">
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
        {items.map((item) => {
          const active = item.id === selected;
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                ref={active ? activeRef : undefined}
                aria-pressed={active}
                onClick={() => onSelect(item.id)}
                style={{ '--cat': item.color } as CSSProperties}
                className={[
                  'flex w-full items-center gap-2 rounded-full border px-3 py-2 text-left text-sm whitespace-nowrap lg:whitespace-normal',
                  'lg:cat-strip lg:rounded-md lg:border-transparent lg:py-1.5 lg:pl-4',
                  active
                    ? 'cat-tint border-[var(--cat)] font-semibold'
                    : 'border-line bg-surface hover:bg-surface-2 lg:bg-transparent',
                  item.count === 0 && !active ? 'text-ink-soft' : '',
                ].join(' ')}
              >
                <span aria-hidden className="text-base">
                  {item.icon}
                </span>
                <span className="lg:flex-1 lg:leading-tight">{item.label}</span>
                <span className="hidden text-xs text-ink-soft tabular lg:inline">
                  {item.count}
                  <span className="sr-only"> produits</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
