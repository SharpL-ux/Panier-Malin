import products from '../data/products.json';
import { locationToStore } from '../services/openPrices';
import { SCHEMA_VERSION, STORAGE_PREFIX } from '../services/storage';
import type { Product } from '../types/catalog';
import { mondayOf } from '../utils/dates';
import { LOCATIONS } from './openPricesFixtures';

const save = (key: string, data: unknown) =>
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify({ v: SCHEMA_VERSION, data }));

/** Enregistre des magasins Open Prices simulés ; le premier devient le magasin principal. */
export function saveStores(...ids: number[]) {
  const stores = ids.map((id) => locationToStore(LOCATIONS.find((l) => l.id === id)));
  save('magasins', { stores, mainStoreId: stores[0]?.id });
}

export function productNamed(name: string): Product {
  const product = (products as unknown as Product[]).find((p) => p.name === name);
  if (!product) throw new Error(`Fiche introuvable : ${name}`);
  return product;
}

/** Enregistre la liste de la semaine en cours : [nom de la fiche, quantité]. */
export function saveList(entries: [string, number][]) {
  const now = new Date().toISOString();
  const items = entries.map(([name, quantity], i) => {
    const p = productNamed(name);
    return {
      id: `article-${i}`,
      productId: p.id,
      quantity,
      step: p.soldByWeight ? 0.5 : 1,
      categoryId: p.categoryId,
      checked: false,
      updatedAt: now,
    };
  });
  const list = {
    id: 'liste-test',
    name: 'Liste de test',
    weekOf: mondayOf(new Date()),
    createdAt: now,
    updatedAt: now,
    items,
  };
  save('listes', { lists: [list], currentId: list.id });
}
