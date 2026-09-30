import { Moon, Sun } from 'lucide-react';
import { useSettings } from '../../hooks/useAppContexts';

export function ThemeToggle() {
  const { theme, toggleTheme } = useSettings();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={dark}
      aria-label="Mode sombre"
      title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="grid size-10 place-items-center rounded-full border border-line-strong bg-surface hover:bg-surface-2"
    >
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
