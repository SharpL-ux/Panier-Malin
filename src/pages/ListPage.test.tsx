import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { SCHEMA_VERSION, STORAGE_PREFIX } from '../services/storage';

function openList(hash = '#/liste') {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App />);
  return user;
}

async function addFromCatalog(
  user: ReturnType<typeof userEvent.setup>,
  query: string,
  label: string,
) {
  window.location.hash = '#/';
  await user.type(await screen.findByRole('searchbox'), query);
  await user.click(screen.getByRole('button', { name: label }));
  await user.clear(screen.getByRole('searchbox'));
}

describe('liste de la semaine', () => {
  it('se renomme', async () => {
    const user = openList();
    await user.click(screen.getByRole('button', { name: 'Renommer la liste' }));
    const input = screen.getByRole('textbox', { name: 'Nom de la liste' });
    await user.clear(input);
    await user.type(input, 'Courses du samedi');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Courses du samedi' }),
    ).toBeInTheDocument();
  });

  it('coche les articles en magasin et garde une note', async () => {
    const user = openList('#/');
    await addFromCatalog(user, 'bananes', 'Ajouter Bananes (au poids) à la liste');
    await user.click(screen.getAllByRole('link', { name: /Ma liste/ })[0]!);

    await user.click(screen.getByRole('checkbox', { name: 'Bananes' }));
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === '1 article, 1 coché'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Note et magasin pour Bananes' }));
    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'bien mûres{Enter}');
    expect(screen.getByText('bien mûres', { selector: 'p' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tout décocher' }));
    expect(screen.getByRole('checkbox', { name: 'Bananes' })).not.toBeChecked();
  });

  it('ajoute les favoris en un geste', async () => {
    const user = openList('#/');
    await user.type(await screen.findByRole('searchbox'), 'riz basmati');
    await user.click(screen.getByRole('button', { name: 'Ajouter Riz basmati aux favoris' }));
    expect(screen.getByRole('button', { name: 'Mes favoris (1)' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('link', { name: /Ma liste/ })[0]!);
    await user.click(screen.getByRole('button', { name: 'Ajouter mes favoris (1)' }));
    expect(screen.getByRole('checkbox', { name: 'Riz basmati' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favoris déjà ajoutés' })).toBeDisabled();
  });

  it('garde l’historique et permet de rouvrir une ancienne liste', async () => {
    const user = openList();
    const first = screen.getByRole('heading', { level: 1 }).textContent ?? '';
    await user.click(screen.getByRole('button', { name: 'Mes listes' }));
    await user.click(screen.getByRole('button', { name: 'Nouvelle liste vide' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(`${first} (2)`);

    await user.click(screen.getByRole('button', { name: 'Mes listes' }));
    const dialog = screen.getByRole('dialog', { name: 'Mes listes' });
    await user.click(within(dialog).getByRole('button', { name: 'Ouvrir' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(first);
  });

  it('propose de reprendre la liste d’une semaine passée', async () => {
    const old = {
      id: 'l1',
      name: 'Semaine du 06/01/2020',
      weekOf: '2020-01-06',
      createdAt: '2020-01-06T08:00:00.000Z',
      updatedAt: '2020-01-06T08:00:00.000Z',
      items: [
        {
          id: 'a1',
          productId: 'bananes',
          quantity: 1.5,
          step: 0.5,
          categoryId: 'fruits',
          checked: true,
          note: 'bien mûres',
          updatedAt: '2020-01-06T08:00:00.000Z',
        },
      ],
    };
    localStorage.setItem(
      `${STORAGE_PREFIX}listes`,
      JSON.stringify({ v: SCHEMA_VERSION, data: { lists: [old], currentId: 'l1' } }),
    );
    const user = openList();
    expect(screen.getByText('Une nouvelle semaine a commencé.')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Reprendre cette liste pour cette semaine' }),
    );

    expect(screen.queryByText('Une nouvelle semaine a commencé.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /^Semaine du \d{2}\/\d{2}\/\d{4}$/,
    );
    expect(screen.getByRole('checkbox', { name: 'Bananes' })).not.toBeChecked();
    expect(screen.getByText('bien mûres')).toBeInTheDocument();
    expect(screen.getByText('1,5 kg')).toBeInTheDocument();
  });
});
