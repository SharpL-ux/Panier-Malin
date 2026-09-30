import type { Category, CategoryId } from '../types/catalog';

/**
 * Les 24 catégories, dans l'ordre logique des rayons : on entre par les fruits et légumes,
 * on passe par le frais et l'épicerie, et on termine par les surgelés pour ne pas rompre
 * la chaîne du froid.
 */
export const CATEGORIES: readonly Category[] = [
  { id: 'fruits', label: 'Fruits', icon: '🍎', color: '#e5484d', aisleOrder: 1 },
  { id: 'legumes', label: 'Légumes', icon: '🥕', color: '#46a758', aisleOrder: 2 },
  {
    id: 'boulangerie',
    label: 'Boulangerie & Viennoiserie',
    icon: '🥖',
    color: '#c2872e',
    aisleOrder: 3,
  },
  { id: 'boucherie', label: 'Boucherie', icon: '🥩', color: '#b5323b', aisleOrder: 4 },
  { id: 'volaille', label: 'Volaille', icon: '🍗', color: '#e08a2e', aisleOrder: 5 },
  { id: 'poissonnerie', label: 'Poissonnerie', icon: '🐟', color: '#2e86c1', aisleOrder: 6 },
  {
    id: 'charcuterie-traiteur',
    label: 'Charcuterie & Traiteur',
    icon: '🥓',
    color: '#c94f6d',
    aisleOrder: 7,
  },
  { id: 'cremerie', label: 'Crèmerie', icon: '🥛', color: '#5b8def', aisleOrder: 8 },
  { id: 'fromages', label: 'Fromages', icon: '🧀', color: '#e6b422', aisleOrder: 9 },
  {
    id: 'yaourts-desserts',
    label: 'Yaourts & Desserts frais',
    icon: '🍮',
    color: '#9c6ade',
    aisleOrder: 10,
  },
  { id: 'petit-dejeuner', label: 'Petit-déjeuner', icon: '🥣', color: '#d9822b', aisleOrder: 11 },
  { id: 'cafe-the', label: 'Café & Thé', icon: '☕', color: '#7a5230', aisleOrder: 12 },
  { id: 'epicerie-salee', label: 'Épicerie salée', icon: '🍝', color: '#d14d2f', aisleOrder: 13 },
  { id: 'epicerie-sucree', label: 'Épicerie sucrée', icon: '🍪', color: '#c8559b', aisleOrder: 14 },
  {
    id: 'produits-du-monde',
    label: 'Produits du monde',
    icon: '🌍',
    color: '#13a89e',
    aisleOrder: 15,
  },
  { id: 'halal', label: 'Halal', icon: '🌙', color: '#2f9e6e', aisleOrder: 16 },
  { id: 'boissons', label: 'Boissons', icon: '🥤', color: '#1fa2d6', aisleOrder: 17 },
  { id: 'alcools', label: 'Alcools', icon: '🍷', color: '#7b2d5b', aisleOrder: 18 },
  { id: 'bebe', label: 'Bébé', icon: '🍼', color: '#6ea8e0', aisleOrder: 19 },
  { id: 'hygiene-beaute', label: 'Hygiène & Beauté', icon: '🧴', color: '#3fb6a8', aisleOrder: 20 },
  { id: 'entretien', label: 'Entretien & Ménage', icon: '🧽', color: '#5a6acf', aisleOrder: 21 },
  {
    id: 'papeterie-maison',
    label: 'Papeterie & Maison',
    icon: '📎',
    color: '#8a8f98',
    aisleOrder: 22,
  },
  { id: 'animaux', label: 'Animaux', icon: '🐾', color: '#a0663a', aisleOrder: 23 },
  { id: 'surgeles', label: 'Surgelés', icon: '❄️', color: '#4aa8d8', aisleOrder: 24 },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  const category = BY_ID.get(id);
  if (!category) throw new Error(`Catégorie inconnue : ${id}`);
  return category;
}

export function isCategoryId(value: string): value is CategoryId {
  return BY_ID.has(value as CategoryId);
}
