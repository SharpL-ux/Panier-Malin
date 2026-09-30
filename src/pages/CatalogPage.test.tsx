import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { SCHEMA_VERSION } from '../services/storage';

function setup() {
  window.location.hash = '#/';
  const user = userEvent.setup();
  render(<App />);
  return user;
}

const count = () => screen.getByText(/\d+ produits?/, { selector: 'p' }).textContent ?? '';
const card = (name: string) =>
  screen.getByRole('heading', { level: 3, name }).closest('article') as HTMLElement;

describe('catalogue', () => {
  beforeEach(() => {
    window.location.hash = '#/';
  });

  it('affiche les 22 rayons et une fiche par produit', () => {
    setup();
    const rayons = screen.getByRole('navigation', { name: 'Rayons' });
    expect(within(rayons).getAllByRole('button')).toHaveLength(23);
    expect(within(rayons).queryByRole('button', { name: /Alcools/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tous les rayons' })).toBeInTheDocument();
    expect(Number(count().split(' ')[0])).toBeGreaterThanOrEqual(170);
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
    ).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Fruits/ }));
    expect(
      screen.getByText('Aucun produit ne correspond à « creme epaisse ».'),
    ).toBeInTheDocument();
  });

  it('ne propose ni porc ni alcool', async () => {
    const user = setup();
    const search = screen.getByRole('searchbox');
    for (const word of ['porc', 'jambon', 'lardons', 'biere', 'vin rouge', 'whisky']) {
      await user.clear(search);
      await user.type(search, word);
      expect(
        screen.getByText(`Aucun produit ne correspond à « ${word} ».`),
        word,
      ).toBeInTheDocument();
    }
  });

  it('signale la viande certifiée halal', async () => {
    const user = setup();
    await user.type(screen.getByRole('searchbox'), 'merguez');
    expect(within(card('Merguez halal')).getByText('Certifié halal')).toBeInTheDocument();
  });

  it('indique quoi prendre en rayon dans l’enseigne choisie', async () => {
    const user = setup();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mon magasin' }), 'lidl');
    await user.type(screen.getByRole('searchbox'), 'lait demi');
    expect(card('Lait demi-écrémé UHT')).toHaveTextContent('Chez Lidl : Milbona');
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'oeufs');
    expect(card('Œufs de plein air')).toHaveTextContent('Chez Lidl : marque Lidl');

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'bananes');
    expect(card('Bananes')).toHaveTextContent('Chez Lidl : vrac ou sans marque');

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'escalopes de poulet');
    expect(card('Escalopes de poulet halal')).toHaveTextContent(
      'Chez Lidl : référence halal à trouver',
    );
  });

  it('ajoute une fiche puis ajuste sa quantité', async () => {
    const user = setup();
    await user.type(screen.getByRole('searchbox'), 'spaghetti');
    await user.click(screen.getByRole('button', { name: 'Ajouter Spaghetti (500 g) à la liste' }));
    const stepper = screen.getByRole('group', { name: 'Quantité de Spaghetti (500 g)' });
    await user.click(within(stepper).getByRole('button', { name: /Augmenter/ }));
    expect(within(stepper).getByText('2')).toBeInTheDocument();
    await user.click(within(stepper).getByRole('button', { name: /Diminuer/ }));
    await user.click(within(stepper).getByRole('button', { name: /Retirer .* de la liste/ }));
    expect(
      screen.getByRole('button', { name: 'Ajouter Spaghetti (500 g) à la liste' }),
    ).toBeInTheDocument();
  });

  it('retrouve les articles dans la liste, classés par rayon, avec la marque à prendre', async () => {
    const user = setup();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mon magasin' }), 'lidl');
    await user.type(screen.getByRole('searchbox'), 'lait demi');
    await user.click(
      screen.getByRole('button', { name: 'Ajouter Lait demi-écrémé UHT (1 L) à la liste' }),
    );

    const [nav] = screen.getAllByRole('link', { name: /Ma liste/ });
    await user.click(nav!);
    expect(
      screen.getByRole('heading', { level: 1, name: /^Semaine du \d{2}\/\d{2}\/\d{4}$/ }),
    ).toBeInTheDocument();
    const rayon = screen
      .getByRole('heading', { level: 2, name: /Crèmerie/ })
      .closest('section') as HTMLElement;
    expect(rayon).toHaveTextContent('Lait demi-écrémé UHT');
    expect(rayon).toHaveTextContent('1 L, Milbona chez Lidl');
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
    await user.click(within(dialog).getByRole('button', { name: 'Créer le produit' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'de test');
    const custom = screen.getByRole('article');
    expect(within(custom).getByText('Ajouté par vous')).toBeInTheDocument();
    expect(within(custom).getByText('Marque Test')).toBeInTheDocument();
    expect(
      within(custom).getByRole('group', { name: /Quantité de Lait demi-écrémé de test/ }),
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
    const stored = JSON.parse(localStorage.getItem('panier-malin:theme') ?? '{}') as {
      v: number;
      data: string;
    };
    expect(stored.v).toBe(SCHEMA_VERSION);
    expect(stored.data).toBe(initial === 'true' ? 'light' : 'dark');
  });
});
