import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

function setup() {
  window.location.hash = '#/';
  const user = userEvent.setup();
  render(<App />);
  return user;
}

const count = () => screen.getByText(/\d+ produits?/, { selector: 'p' }).textContent ?? '';

describe('catalogue', () => {
  beforeEach(() => {
    window.location.hash = '#/';
  });

  it('affiche les rayons et le catalogue complet', () => {
    setup();
    const rayons = screen.getByRole('navigation', { name: 'Rayons' });
    expect(within(rayons).getAllByRole('button')).toHaveLength(25);
    expect(screen.getByRole('heading', { level: 1, name: 'Tous les rayons' })).toBeInTheDocument();
    expect(Number(count().split(' ')[0])).toBeGreaterThanOrEqual(400);
    // Aucun prix n'est inventé : sans source branchée, chaque carte l'indique.
    expect(screen.getAllByText('Prix non disponible').length).toBeGreaterThan(0);
  });

  it('recherche sans tenir compte des accents et filtre par rayon', async () => {
    const user = setup();
    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher un produit' }),
      'creme epaisse',
    );
    expect(
      await screen.findAllByRole('heading', { level: 3, name: 'Crème fraîche épaisse' }),
    ).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: /Fruits/ }));
    expect(screen.getByText(/Aucun produit ne correspond à « creme epaisse »/)).toBeInTheDocument();
  });

  it('n’affiche que les produits vendus dans l’enseigne choisie', async () => {
    const user = setup();
    await user.type(screen.getByRole('searchbox'), 'lait demi ecreme uht');
    const before = screen.getAllByRole('article').length;
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mon magasin' }), 'lidl');
    expect(count()).toMatch(/chez Lidl/);
    const brands = screen
      .getAllByRole('article')
      .map((a) => within(a).getByRole('heading').nextSibling?.textContent);
    expect(brands.join()).not.toMatch(/Carrefour|Marque Repère|Eco\+|Simpl/);
    expect(brands.join()).toMatch(/Milbona/);
    expect(screen.getAllByRole('article').length).toBeLessThan(before);
  });

  it('ajoute un produit précis puis ajuste sa quantité', async () => {
    const user = setup();
    await user.type(screen.getByRole('searchbox'), 'spaghetti barilla');
    await user.click(
      screen.getByRole('button', { name: 'Ajouter Spaghetti Barilla 500 g à la liste' }),
    );
    const stepper = screen.getByRole('group', { name: 'Quantité de Spaghetti Barilla 500 g' });
    await user.click(within(stepper).getByRole('button', { name: /Augmenter/ }));
    expect(within(stepper).getByText('2')).toBeInTheDocument();
    await user.click(within(stepper).getByRole('button', { name: /Diminuer/ }));
    await user.click(within(stepper).getByRole('button', { name: /Retirer .* de la liste/ }));
    expect(
      screen.getByRole('button', { name: 'Ajouter Spaghetti Barilla 500 g à la liste' }),
    ).toBeInTheDocument();
  });

  it('ajoute « peu importe la marque » et le retrouve dans la liste', async () => {
    const user = setup();
    await user.type(screen.getByRole('searchbox'), 'lait demi ecreme lactel');
    const [first] = screen.getAllByRole('button', {
      name: 'Ajouter Lait demi-écrémé UHT, peu importe la marque',
    });
    await user.click(first!);
    expect(
      screen.getAllByRole('group', {
        name: 'Quantité de Lait demi-écrémé UHT, peu importe la marque',
      })[0],
    ).toHaveTextContent('1 L');

    const [nav] = screen.getAllByRole('link', { name: /Ma liste/ });
    await user.click(nav!);
    expect(
      screen.getByRole('heading', { level: 1, name: /^Semaine du \d{2}\/\d{2}\/\d{4}$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Peu importe la marque')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Crèmerie/ })).toBeInTheDocument();
  });
});

describe('produit personnalisé', () => {
  it('préremplit la fiche depuis Open Food Facts et l’ajoute au catalogue et à la liste', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Ajouter un produit' }));
    const dialog = screen.getByRole('dialog', { name: 'Ajouter un produit' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Code-barres' }), '4006381333931');
    await user.click(within(dialog).getByRole('button', { name: 'Rechercher' }));
    expect(
      await within(dialog).findByText(/Trouvé : Lait demi-écrémé de test/),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Nom du produit' })).toHaveValue(
      'Lait demi-écrémé de test',
    );
    expect(within(dialog).getByRole('textbox', { name: 'Marque' })).toHaveValue('Marque Test');
    expect(within(dialog).getByRole('textbox', { name: 'Contenance' })).toHaveValue('1000');

    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Rayon' }), 'cremerie');
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Équivalent à' }),
      'lait-demi-ecreme',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Créer le produit' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'de test');
    const card = screen.getByRole('article');
    expect(within(card).getByText('Ajouté par vous')).toBeInTheDocument();
    expect(
      within(card).getByRole('group', { name: /Quantité de Lait demi-écrémé de test/ }),
    ).toBeInTheDocument();
  });

  it('explique les champs manquants et un code-barres invalide', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Ajouter un produit' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', { name: 'Code-barres' }), '1234567890123');
    expect(within(dialog).getByText(/ne semble pas valide/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Créer le produit' }));
    expect(within(dialog).getByText('Indiquez le nom du produit.')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Nom du produit' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('propose de créer un produit introuvable avec le nom recherché', async () => {
    const user = setup();
    await user.type(screen.getByRole('searchbox'), 'kombucha gingembre');
    await user.click(screen.getByRole('button', { name: 'Créer « kombucha gingembre »' }));
    expect(
      within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nom du produit' }),
    ).toHaveValue('kombucha gingembre');
  });
});

describe('préférences', () => {
  it('bascule le mode sombre et le mémorise', async () => {
    const user = setup();
    const toggle = screen.getByRole('button', { name: 'Mode sombre' });
    const initial = toggle.getAttribute('aria-pressed');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', initial === 'true' ? 'false' : 'true');
    expect(localStorage.getItem('panier-malin:theme')).toContain('"v":1');
  });
});
