import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-ink-soft">
        Cette adresse ne correspond à aucune page de l’application.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 font-medium text-on-primary"
      >
        Revenir au catalogue
      </Link>
    </div>
  );
}
