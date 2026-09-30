/** Enseignes gérées. Aucun logo officiel n'est utilisé : seulement un badge coloré avec le nom. */
export type EnseigneId = 'carrefour' | 'lidl' | 'leclerc' | 'hmarket' | 'marka';

export type CategoryId =
  | 'fruits'
  | 'legumes'
  | 'boulangerie'
  | 'boucherie'
  | 'volaille'
  | 'poissonnerie'
  | 'charcuterie-traiteur'
  | 'cremerie'
  | 'fromages'
  | 'yaourts-desserts'
  | 'petit-dejeuner'
  | 'cafe-the'
  | 'epicerie-salee'
  | 'epicerie-sucree'
  | 'produits-du-monde'
  | 'halal'
  | 'boissons'
  | 'alcools'
  | 'bebe'
  | 'hygiene-beaute'
  | 'entretien'
  | 'papeterie-maison'
  | 'animaux'
  | 'surgeles';

/** Unité de référence utilisée pour comparer des formats différents (€/kg, €/L, €/pièce). */
export type RefUnit = 'kg' | 'L' | 'piece';

/** Unité d'un conditionnement tel qu'il est vendu. */
export type PackUnit = 'g' | 'ml' | 'piece';

/** Conditionnement : `count` × `size` `unit`, par exemple 6 × 1000 ml. */
export interface Pack {
  count: number;
  size: number;
  unit: PackUnit;
}

export type BrandType = 'nationale' | 'distributeur' | 'sans-marque';

export interface Product {
  /** Identifiant stable, lisible : "lait-demi-ecreme-milbona-1l". */
  id: string;
  name: string;
  brand: string;
  brandType: BrandType;
  /** Enseignes qui vendent ce produit. Liste vide = vendu partout (marques nationales, vrac). */
  enseignes: EnseigneId[];
  categoryId: CategoryId;
  /** Emoji affiché sur la carte. */
  icon: string;
  /** Code-barres EAN-8 ou EAN-13. Chaîne vide tant qu'il n'a pas été vérifié : on n'invente jamais un code. */
  ean: string;
  /** Pour les produits au poids : catégorie Open Food Facts utilisée par Open Prices (prix de type CATEGORY). */
  offCategoryTag?: string;
  pack: Pack;
  /** Vendu au poids : la quantité de la liste est exprimée en kg. */
  soldByWeight: boolean;
  /** Groupe d'équivalence : produits interchangeables pour la comparaison entre enseignes. */
  equivalenceGroup: string;
  flags: { bio: boolean; halal: boolean };
  /** Image fournie par Open Food Facts (produits personnalisés uniquement). */
  imageUrl?: string;
  /** Produit ajouté par l'utilisateur, stocké localement. */
  custom?: boolean;
}

export interface EquivalenceGroup {
  id: string;
  label: string;
  categoryId: CategoryId;
  refUnit: RefUnit;
}

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  /** Teinte de la catégorie, utilisée pour l'onglet de rayon et le fond de l'icône. */
  color: string;
  /** Ordre de passage dans les rayons (1 = entrée du magasin). */
  aisleOrder: number;
}

export interface Enseigne {
  id: EnseigneId;
  label: string;
  /** Couleur du badge (fond) et couleur du texte, choisies pour un contraste suffisant. */
  badgeBg: string;
  badgeFg: string;
  /** Motifs permettant de reconnaître l'enseigne dans les noms et marques OpenStreetMap. */
  osmPatterns: string[];
}
