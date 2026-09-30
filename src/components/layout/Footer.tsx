import { REPO_URL } from '../../config';

const link = 'underline decoration-line-strong underline-offset-2 hover:decoration-ink';

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface pb-24 text-sm text-ink-soft lg:pb-0">
      <div className="mx-auto max-w-7xl space-y-2 px-4 py-6">
        <p>
          Prix et données produits :{' '}
          <a
            className={link}
            href="https://prices.openfoodfacts.org"
            target="_blank"
            rel="noreferrer"
          >
            Open Prices
          </a>{' '}
          et{' '}
          <a
            className={link}
            href="https://world.openfoodfacts.org"
            target="_blank"
            rel="noreferrer"
          >
            Open Food Facts
          </a>
          , sous licence{' '}
          <a
            className={link}
            href="https://opendatacommons.org/licenses/odbl/1-0/"
            target="_blank"
            rel="noreferrer"
          >
            Open Database License (ODbL)
          </a>
          . Ces prix sont relevés par des bénévoles : ils peuvent être incomplets ou dater.
        </p>
        <p>
          Application libre sous licence MIT,{' '}
          <a className={link} href={REPO_URL} target="_blank" rel="noreferrer">
            code source sur GitHub
          </a>
          . Les noms d'enseignes et de marques appartiennent à leurs propriétaires ; ce projet n'est
          affilié à aucune enseigne.
        </p>
      </div>
    </footer>
  );
}
