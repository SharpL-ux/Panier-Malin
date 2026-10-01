import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { OPEN_PRICES_API_URL } from '../services/endpoints';
import { saveStores } from '../test/helpers';
import { server } from '../test/server';

function start(hash: string) {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App />);
  return user;
}

describe('mes magasins', () => {
  it('cherche des magasins sur Open Prices et les ajoute', async () => {
    const user = start('#/magasins');
    await user.type(screen.getByRole('textbox', { name: 'Ville ou nom du magasin' }), 'courbevoie');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(await screen.findByText('2 magasins trouvés pour « courbevoie »')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ajouter Lidl, Courbevoie' }));
    expect(screen.getByRole('heading', { name: 'Magasins choisis (1/10)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lidl, Courbevoie déjà ajouté' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Magasin principal' })).toBeChecked();
  });

  it('ajoute à la main un magasin absent d’Open Prices, puis le retire', async () => {
    const user = start('#/magasins');
    await user.click(screen.getByText('Mon magasin n’est pas sur Open Prices'));
    await user.type(screen.getByRole('textbox', { name: 'Nom du magasin' }), 'Marka Market');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Enseigne' }), 'marka');
    await user.type(screen.getByRole('textbox', { name: 'Ville' }), 'Paris');
    await user.click(screen.getByRole('button', { name: 'Ajouter ce magasin' }));
    const chosen = screen
      .getByRole('heading', { name: 'Magasins choisis (1/10)' })
      .closest('section') as HTMLElement;
    expect(
      within(chosen).getByRole('button', { name: 'Retirer Marka Market, Paris' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retirer Marka Market, Paris' }));
    expect(screen.getByRole('heading', { name: 'Magasins choisis (0/10)' })).toBeInTheDocument();
  });

  it('explique une panne d’Open Prices', async () => {
    server.use(
      http.get(`${OPEN_PRICES_API_URL}/locations`, () => new HttpResponse(null, { status: 503 })),
    );
    const user = start('#/magasins');
    await user.type(screen.getByRole('textbox', { name: 'Ville ou nom du magasin' }), 'courbevoie');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(
      await screen.findByText('Open Prices a répondu avec une erreur (503).'),
    ).toBeInTheDocument();
  });
});

describe('prix sur les fiches', () => {
  it('affiche le prix le plus bas de vos magasins, avec magasin, date et source', async () => {
    saveStores(101, 102);
    const user = start('#/');
    await user.type(screen.getByRole('searchbox'), 'bananes');
    const card = screen
      .getByRole('heading', { level: 3, name: 'Bananes' })
      .closest('article') as HTMLElement;
    expect(await within(card).findByLabelText('1,99 €')).toBeInTheDocument();
    expect(card).toHaveTextContent('Lidl, Courbevoie, le 20/09/2026, Open Prices');
    expect(card).toHaveTextContent('1,99 € / kg');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Mon magasin' }), 'carrefour');
    expect(within(card).getByLabelText('2,39 €')).toBeInTheDocument();
  });

  it('enregistre votre prix, prioritaire sur Open Prices', async () => {
    saveStores(101, 102);
    const user = start('#/');
    await user.type(screen.getByRole('searchbox'), 'pommes');
    const card = screen
      .getByRole('heading', { level: 3, name: 'Pommes' })
      .closest('article') as HTMLElement;
    expect(await within(card).findByLabelText('2,19 €')).toBeInTheDocument();

    await user.click(
      within(card).getByRole('button', { name: 'Saisir un prix pour Pommes (au poids)' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Prix : Pommes' });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Magasin' }), 'op-101');
    await user.type(within(dialog).getByRole('textbox', { name: /Prix payé/ }), '1,89');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer mon prix' }));
    expect(
      within(dialog).getByRole('button', { name: 'Supprimer votre prix chez Lidl, Courbevoie' }),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Fermer' }));

    expect(within(card).getByLabelText('1,89 €')).toBeInTheDocument();
    expect(card).toHaveTextContent('votre prix');
  });

  it('invite à choisir ses magasins avant de saisir un prix', async () => {
    const user = start('#/');
    await user.type(screen.getByRole('searchbox'), 'bananes');
    await user.click(
      screen.getByRole('button', { name: 'Saisir un prix pour Bananes (au poids)' }),
    );
    expect(screen.getByRole('link', { name: 'Choisir mes magasins' })).toBeInTheDocument();
  });
});
