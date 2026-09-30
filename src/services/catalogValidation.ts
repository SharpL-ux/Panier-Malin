import { isCategoryId } from '../data/categories';
import { isEnseigneId } from '../data/enseignes';
import type { EquivalenceGroup, Product } from '../types/catalog';
import { isValidEan } from '../utils/ean';
import { isPackCompatible } from '../utils/units';

/**
 * Vérifie la cohérence du catalogue. Exécutée par les tests (donc par la CI) à chaque
 * modification de products.json ou equivalenceGroups.json.
 */
export function validateCatalog(products: Product[], groups: EquivalenceGroup[]): string[] {
  const errors: string[] = [];
  const groupById = new Map<string, EquivalenceGroup>();
  for (const group of groups) {
    if (groupById.has(group.id)) errors.push(`Groupe en double : ${group.id}`);
    groupById.set(group.id, group);
    if (!isCategoryId(group.categoryId))
      errors.push(`Groupe ${group.id} : catégorie inconnue ${group.categoryId}`);
  }

  const ids = new Set<string>();
  const eans = new Map<string, string>();
  const usedGroups = new Set<string>();

  for (const p of products) {
    const where = `Produit ${p.id}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) errors.push(`${where} : identifiant invalide`);
    if (ids.has(p.id)) errors.push(`${where} : identifiant en double`);
    ids.add(p.id);
    if (!p.name.trim()) errors.push(`${where} : nom vide`);
    if (!isCategoryId(p.categoryId)) errors.push(`${where} : catégorie inconnue ${p.categoryId}`);
    for (const e of p.enseignes)
      if (!isEnseigneId(e)) errors.push(`${where} : enseigne inconnue ${e}`);

    if (p.brandType === 'distributeur' && p.enseignes.length === 0) {
      errors.push(`${where} : une marque de distributeur doit indiquer son enseigne`);
    }
    if (p.brandType !== 'distributeur' && p.enseignes.length > 0) {
      errors.push(`${where} : seules les marques de distributeur sont limitées à une enseigne`);
    }

    if (p.ean !== '') {
      if (!isValidEan(p.ean)) errors.push(`${where} : code-barres invalide (${p.ean})`);
      const other = eans.get(p.ean);
      if (other) errors.push(`${where} : code-barres déjà utilisé par ${other}`);
      eans.set(p.ean, p.id);
    }

    const { count, size, unit } = p.pack;
    if (!(Number.isInteger(count) && count >= 1 && size > 0))
      errors.push(`${where} : conditionnement invalide`);
    if (!['g', 'ml', 'piece'].includes(unit))
      errors.push(`${where} : unité de conditionnement inconnue`);

    const group = groupById.get(p.equivalenceGroup);
    if (!group) {
      errors.push(`${where} : groupe d'équivalence inconnu ${p.equivalenceGroup}`);
    } else {
      usedGroups.add(group.id);
      if (group.categoryId !== p.categoryId)
        errors.push(`${where} : catégorie différente de celle de son groupe`);
      if (!isPackCompatible(p.pack, group.refUnit)) {
        errors.push(
          `${where} : conditionnement incompatible avec l'unité du groupe (${group.refUnit})`,
        );
      }
    }

    if (p.soldByWeight && unit !== 'g')
      errors.push(`${where} : un produit au poids doit être exprimé en grammes`);
    if (p.offCategoryTag !== undefined && !/^[a-z]{2}:[a-z0-9-]+$/.test(p.offCategoryTag)) {
      errors.push(`${where} : catégorie Open Food Facts mal formée (${p.offCategoryTag})`);
    }
  }

  for (const group of groups)
    if (!usedGroups.has(group.id)) errors.push(`Groupe ${group.id} : aucun produit`);
  return errors;
}
