import { LayoutGrid, ListChecks, Scale, Store, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Affiche le nombre d'articles de la liste. */
  showCount?: boolean;
}

/** Entrées de navigation, dans la barre du haut sur ordinateur et en bas sur mobile. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Catalogue', icon: LayoutGrid },
  { to: '/liste', label: 'Ma liste', icon: ListChecks, showCount: true },
  { to: '/comparer', label: 'Comparer', icon: Scale },
  { to: '/magasins', label: 'Magasins', icon: Store },
];
