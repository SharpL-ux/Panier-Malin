import { HashRouter, Route, Routes } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { AppProviders } from './components/providers/AppProviders';
import { CatalogPage } from './pages/CatalogPage';
import { ListPage } from './pages/ListPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Routage par ancre (#/liste) : GitHub Pages ne sait pas renvoyer index.html pour
 * une route inconnue, un rafraîchissement sur /liste donnerait une erreur 404.
 */
export function App() {
  return (
    <AppProviders>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<CatalogPage />} />
            <Route path="liste" element={<ListPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProviders>
  );
}
