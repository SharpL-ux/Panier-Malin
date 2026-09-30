/** Enseignes gérées. Aucun logo officiel n'est utilisé : seulement un badge coloré avec le nom. */
export type EnseigneId = 'carrefour' | 'lidl' | 'leclerc' | 'hmarket' | 'marka';

/** Rayons, dans l'ordre de passage en magasin. Le catalogue est halal : pas de rayon alcools. */
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
  | 'boissons'
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

/**
 * Ce qu'il faut prendre en rayon dans une enseigne pour une fiche : sa gamme la moins
 * chère connue (premier prix ou marque de l'enseigne).
 */
export interface StoreReference {
  enseigne: EnseigneId;
  brand: string;
  /** Code-barres EAN-8 ou EAN-13. Chaîne vide tant qu'il n'a pas été vérifié : on n'invente jamais un code. */
  ean: string;
  /** Format de cette référence, s'il diffère de celui de la fiche (couches par 44 ou par 48…). */
  pack?: Pack;
}

/**
 * Une fiche produit : ce que l'on met dans sa liste (« Lait demi-écrémé UHT, 1 L »),
 * sans choisir de marque. Le comparateur cherche son prix dans chaque magasin.
 */
export interface Product {
  /** Identifiant stable, lisible : "lait-demi-ecreme-uht". */
  id: string;
  name: string;
  categoryId: CategoryId;
  /** Emoji affiché sur la carte. */
  icon: string;
  /** Format courant, utilisé pour la quantité de la liste (1 kg pour le vrac). */
  pack: Pack;
  /** Vendu au poids : la quantité de la liste est exprimée en kg. */
  soldByWeight: boolean;
  /** Viande, volaille ou charcuterie certifiée halal. */
  halal: boolean;
  /** Une référence par enseigne au plus. Vide pour le vrac et quand la référence reste à trouver. */
  references: StoreReference[];
  /** Pour le vrac : catégorie Open Food Facts utilisée par Open Prices (prix au kilo ou à la pièce). */
  offCategoryTag?: string;
  /** Produit personnalisé précis : sa marque et son code-barres, recherchés dans tous les magasins. */
  brand?: string;
  ean?: string;
  /** Image fournie par Open Food Facts (produits personnalisés uniquement). */
  imageUrl?: string;
  /** Produit ajouté par l'utilisateur, stocké localement. */
  custom?: boolean;
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
