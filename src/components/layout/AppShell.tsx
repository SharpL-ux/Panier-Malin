import { useRef } from 'react';
import { Outlet } from 'react-router';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileTabBar } from './MobileTabBar';

export function AppShell() {
  const main = useRef<HTMLElement>(null);
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Lien d'évitement : un bouton, car une ancre #contenu changerait de route avec HashRouter. */}
      <button
        type="button"
        onClick={() => main.current?.focus()}
        className="sr-only z-50 rounded bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Aller au contenu
      </button>
      <Header />
      <main ref={main} tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}
