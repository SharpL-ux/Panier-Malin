import { getEnseigne } from '../../data/enseignes';
import type { EnseigneId } from '../../types/catalog';

/** Badge coloré portant le nom de l'enseigne (pas de logo officiel). */
export function EnseigneBadge({ id, title }: { id: EnseigneId; title?: string }) {
  const enseigne = getEnseigne(id);
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-xs leading-none font-semibold whitespace-nowrap"
      style={{ background: enseigne.badgeBg, color: enseigne.badgeFg }}
    >
      {enseigne.label}
    </span>
  );
}
