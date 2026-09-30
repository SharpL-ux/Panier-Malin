/**
 * Migrations des données enregistrées dans le navigateur. MIGRATIONS[clé][n] transforme la
 * version n d'une valeur en version n + 1. Les fonctions reçoivent des données non typées :
 * elles doivent rester tolérantes à un contenu inattendu.
 */

type Migration = (data: unknown) => unknown;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * v1 → v2 : passage à une fiche par produit. Les anciens articles visaient des produits de
 * marque ou des groupes d'équivalence qui n'existent plus : les listes sont conservées, vidées.
 */
function listsV1toV2(data: unknown): unknown {
  if (!isRecord(data) || !Array.isArray(data.lists)) return data;
  return {
    ...data,
    lists: data.lists.map((list) => (isRecord(list) ? { ...list, items: [] } : list)),
  };
}

/** v1 → v2 : les produits personnalisés gardent nom, marque, code-barres, format et image. */
function customProductsV1toV2(data: unknown): unknown {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).map((p) => {
    const flags = isRecord(p.flags) ? p.flags : {};
    return {
      id: p.id,
      name: p.name,
      categoryId: p.categoryId,
      icon: p.icon,
      pack: p.pack,
      soldByWeight: Boolean(p.soldByWeight),
      halal: Boolean(flags.halal),
      references: [],
      ...(typeof p.brand === 'string' && p.brandType !== 'sans-marque' ? { brand: p.brand } : {}),
      ...(typeof p.ean === 'string' && p.ean ? { ean: p.ean } : {}),
      ...(typeof p.imageUrl === 'string' ? { imageUrl: p.imageUrl } : {}),
      custom: true,
    };
  });
}

export const MIGRATIONS: Record<string, Record<number, Migration>> = {
  listes: { 1: listsV1toV2 },
  'catalogue:produits-perso': { 1: customProductsV1toV2 },
};

/** Clés qui ne servent plus et peuvent être supprimées au démarrage. */
export const OBSOLETE_KEYS = ['catalogue:groupes-perso'];
