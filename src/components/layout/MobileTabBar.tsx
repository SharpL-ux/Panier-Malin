import { NavLink } from 'react-router';
import { useShoppingList } from '../../hooks/useAppContexts';
import { NAV_ITEMS } from './navItems';

/** Barre d'onglets en bas d'écran sur mobile : atteignable au pouce, en magasin. */
export function MobileTabBar() {
  const { list } = useShoppingList();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                `relative flex h-16 flex-col items-center justify-center gap-0.5 text-sm font-medium ${isActive ? 'text-ink' : 'text-ink-soft'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={`absolute top-0 h-1 w-12 rounded-b ${isActive ? 'bg-primary' : 'bg-transparent'}`}
                  />
                  <span className="relative">
                    <item.icon size={22} aria-hidden />
                    {item.showCount && list.items.length > 0 && (
                      <span className="absolute -top-1.5 -right-3 min-w-5 rounded-full bg-primary px-1 text-center text-xs leading-5 font-semibold text-on-primary tabular">
                        {list.items.length}
                      </span>
                    )}
                  </span>
                  <span>
                    {item.label}
                    {item.showCount && list.items.length > 0 && (
                      <span className="sr-only">, {list.items.length} articles</span>
                    )}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
