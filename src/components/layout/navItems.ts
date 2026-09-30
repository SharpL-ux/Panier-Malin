import { LayoutGrid, ListChecks, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Affiche le nombre d'articles de la liste. */
  showCount?: boolean;
}

/** Les écrans Comparer et Mes magasins s'ajouteront ici aux étapes suivantes. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Catalogue', icon: LayoutGrid },
  { to: '/liste', label: 'Ma liste', icon: ListChecks, showCount: true },
];
