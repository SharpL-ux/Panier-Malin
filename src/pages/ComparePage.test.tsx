import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { saveList, saveStores } from '../test/helpers';

function start(hash = '#/comparer') {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App />);
  return user;
}

describe('comparateur', () => {
  it('invite à choisir des magasins', () => {
    start();
    expect(screen.getByRole('link', { name: 'Choisir mes magasins' })).toBeInTheDocument();
  });

  it('compare les totaux, désigne le moins cher et détaille article par article', async () => {
    saveStores(101, 102);
    saveList([
      ['Bananes', 1],
      ['Pommes', 1],
      ['Riz basmati', 1],
    ]);
    const user = start();
    expect(
      await screen.findByText(
        'En allant chez Lidl, Courbevoie plutôt que chez Carrefour Market, Courbevoie, vous économisez 0,10 € (2 %).',
      ),
    ).toBeInTheDocument();
    const [first, second] = within(
      screen.getByRole('list', { name: 'Total par magasin' }),
    ).getAllByRole('listitem');
    expect(first).toHaveTextContent('Lidl, Courbevoie');
    expect(first).toHaveTextContent('Le moins cher');
    expect(first).toHaveTextContent('4,48 €');
    expect(first).toHaveTextContent('2/3 articles avec prix');
    expect(second).toHaveTextContent('Le plus cher');
    expect(second).toHaveTextContent('0,10 € de plus que le moins cher');

    const table = screen.getByRole('table');
    const bananes = within(table).getByRole('row', { name: /Bananes/ });
    expect(within(bananes).getAllByRole('cell')[0]).toHaveTextContent('1,99 €, le moins cher');
    expect(within(bananes).getAllByRole('cell')[1]).toHaveTextContent('2,39 €, le plus cher');
    expect(
      within(table).getByRole('button', {
        name: 'Saisir le prix de Riz basmati chez Lidl, Courbevoie',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Articles communs' }));
    expect(within(table).getByRole('rowheader', { name: /Riz basmati/ })).toHaveTextContent(
      'non compté',
    );
    expect(
      within(table).getByRole('rowheader', { name: 'Total des articles communs' }),
    ).toBeInTheDocument();
  });

  it('montre l’historique des prix d’un article', async () => {
    saveStores(101, 102);
    saveList([['Bananes', 1]]);
    const user = start();
    await user.click(await screen.findByRole('button', { name: 'Historique des prix de Bananes' }));
    const dialog = screen.getByRole('dialog', { name: 'Historique : Bananes' });
    expect(await within(dialog).findByText('Voir les relevés (2)')).toBeInTheDocument();
    expect(within(dialog).getByText('Carrefour Market, Courbevoie')).toBeInTheDocument();
    expect(within(dialog).getByText('2,39 €')).toBeInTheDocument();
  });

  it('affiche les prix et le total estimé dans la liste', async () => {
    saveStores(101, 102);
    saveList([
      ['Bananes', 1],
      ['Pommes', 1],
    ]);
    start('#/liste');
    expect(
      await screen.findByRole('link', {
        name: /^Moins cher chez Lidl, Courbevoie : 4,48\s€ \(2\/2 articles avec prix\)$/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('2,19 €')).toBeInTheDocument();
  });
});
