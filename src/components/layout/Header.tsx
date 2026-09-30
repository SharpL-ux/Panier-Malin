import { Link, NavLink } from 'react-router';
import { useShoppingList } from '../../hooks/useAppContexts';
import { EnseignePicker } from './EnseignePicker';
import { NAV_ITEMS } from './navItems';
import { ThemeToggle } from './ThemeToggle';

export function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
      <rect
        x="6"
        y="10"
        width="52"
        height="40"
        rx="6"
        fill="#ffd23f"
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle cx="16" cy="22" r="4" fill="currentColor" />
      <path d="M26 40h22M26 30h14" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const { list } = useShoppingList();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 rounded text-ink">
          <Logo />
          <span className="font-display text-2xl leading-none font-bold max-[26rem]:sr-only">
            Panier malin
          </span>
        </Link>
        <nav aria-label="Navigation principale" className="ml-6 hidden gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex h-10 items-center gap-2 rounded-full px-4 font-medium ${isActive ? 'bg-primary text-on-primary' : 'hover:bg-surface-2'}`
              }
            >
              <item.icon size={18} aria-hidden />
              {item.label}
              {item.showCount && list.items.length > 0 && (
                <span className="tabular" aria-label={`, ${list.items.length} articles`}>
                  ({list.items.length})
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <EnseignePicker />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
