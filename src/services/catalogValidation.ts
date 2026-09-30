import { isCategoryId } from '../data/categories';
import { isEnseigneId } from '../data/enseignes';
import type { Pack, Product } from '../types/catalog';
import { isValidEan } from '../utils/ean';
import { normalizeText } from '../utils/text';
import { refUnitOf } from '../utils/units';

/**
 * Règles halal du catalogue partagé. Elles ne s'appliquent pas aux produits
 * personnalisés, qui restent sur l'appareil de chacun.
 */
const FORBIDDEN = [
  /\bporcs?\b/,
  /\blardons?\b/,
  /\brillettes?\b/,
  /\bchipolatas?\b/,
  /\bgelatine\b/,
  /\bbieres?\b/,
  /\bvins?\b/,
  /\bwhisky\b/,
  /\bpastis\b/,
  /\bcidres?\b/,
  /\brhum\b/,
  /\bvodka\b/,
  /\bliqueurs?\b/,
  /\balcools?\b/,
];
/** Autorisés seulement s'ils sont certifiés halal (jambon de dinde, saucisson de bœuf…). */
const HALAL_ONLY = [/\bjambons?\b/, /\bsaucissons?\b/];
/** Toute viande ou volaille du catalogue doit être certifiée halal. */
const MEAT = /\b(poulet|dinde|volaille|boeuf|agneau|veau|mouton|merguez|chorizo|viande|steaks?)\b/;
const MEAT_CATEGORIES = new Set(['boucherie', 'volaille']);

export function checkHalalRules(product: Product): string[] {
  const errors: string[] = [];
  const name = normalizeText(product.name);
  const where = `Produit ${product.id}`;
  if (FORBIDDEN.some((re) => re.test(name)))
    errors.push(`${where} : produit non halal (porc, alcool ou gélatine)`);
  if (!product.halal && HALAL_ONLY.some((re) => re.test(name))) {
    errors.push(`${where} : ce produit n'est accepté que certifié halal`);
  }
  const isMeat =
    MEAT_CATEGORIES.has(product.categoryId) ||
    (product.categoryId !== 'animaux' && MEAT.test(name));
  if (isMeat && !product.halal) errors.push(`${where} : viande ou volaille non certifiée halal`);
  return errors;
}

function isValidPack(pack: Pack): boolean {
  return (
    Number.isInteger(pack.count) &&
    pack.count >= 1 &&
    pack.size > 0 &&
    ['g', 'ml', 'piece'].includes(pack.unit)
  );
}

/**
 * Vérifie la cohérence du catalogue. Exécutée par les tests (donc par la CI) à chaque
 * modification de products.json.
 */
export function validateCatalog(products: Product[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const eans = new Map<string, string>();

  const checkEan = (ean: string, owner: string) => {
    if (ean === '') return;
    if (!isValidEan(ean)) errors.push(`${owner} : code-barres invalide (${ean})`);
    const other = eans.get(ean);
    if (other) errors.push(`${owner} : code-barres déjà utilisé par ${other}`);
    eans.set(ean, owner);
  };

  for (const p of products) {
    const where = `Produit ${p.id}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) errors.push(`${where} : identifiant invalide`);
    if (ids.has(p.id)) errors.push(`${where} : identifiant en double`);
    ids.add(p.id);
    if (!p.name.trim()) errors.push(`${where} : nom vide`);
    if (!isCategoryId(p.categoryId)) errors.push(`${where} : rayon inconnu ${p.categoryId}`);
    if (!isValidPack(p.pack)) errors.push(`${where} : format invalide`);
    if (p.soldByWeight && p.pack.unit !== 'g')
      errors.push(`${where} : un produit au poids doit être exprimé en grammes`);
    if (p.offCategoryTag !== undefined && !/^[a-z]{2}:[a-z0-9-]+$/.test(p.offCategoryTag)) {
      errors.push(`${where} : catégorie Open Food Facts mal formée (${p.offCategoryTag})`);
    }
    if (p.brand !== undefined || p.ean !== undefined || p.custom) {
      errors.push(
        `${where} : marque, code-barres et « custom » sont réservés aux produits personnalisés`,
      );
    }

    const seen = new Set<string>();
    for (const ref of p.references) {
      const owner = `${where} (${ref.enseigne})`;
      if (!isEnseigneId(ref.enseigne)) errors.push(`${owner} : enseigne inconnue`);
      if (seen.has(ref.enseigne)) errors.push(`${owner} : une seule référence par enseigne`);
      seen.add(ref.enseigne);
      if (!ref.brand.trim()) errors.push(`${owner} : marque vide`);
      if (ref.pack && !isValidPack(ref.pack)) errors.push(`${owner} : format invalide`);
      if (ref.pack && refUnitOf(ref.pack) !== refUnitOf(p.pack)) {
        errors.push(`${owner} : format incomparable avec celui de la fiche`);
      }
      checkEan(ref.ean, owner);
    }

    errors.push(...checkHalalRules(p));
  }
  return errors;
}
