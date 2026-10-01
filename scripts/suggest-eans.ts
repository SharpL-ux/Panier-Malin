/**
 * Propose des codes-barres pour les références du catalogue qui n'en ont pas, à partir des
 * produits déjà relevés sur Open Prices. Produit un fichier CSV à relire : rien n'est écrit
 * dans le catalogue.
 *
 *   npm run eans:proposer                 tout le catalogue
 *   npm run eans:proposer -- --rayon cremerie --limite 20
 *
 * Nécessite un accès à Internet. Une requête par seconde au plus, pour ménager le service.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import products from '../src/data/products.json';
import type { Product } from '../src/types/catalog';
import {
  brandQuery,
  parseCandidate,
  rankCandidates,
  searchKeywords,
  toCsv,
  type Candidate,
  type Suggestion,
} from './lib/eanSuggestions';

const API = 'https://prices.openfoodfacts.org/api/v1/products';
const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const rayon = option('rayon');
const limite = Number(option('limite') ?? Infinity);
const sortie = option('sortie') ?? 'scripts/out/propositions-eans.csv';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function search(brand: string, keyword: string): Promise<Candidate[]> {
  const url = new URL(API);
  url.search = new URLSearchParams({
    brands__like: brandQuery(brand),
    product_name__like: keyword,
    price_count__gte: '1',
    order_by: '-price_count',
    size: '10',
  }).toString();
  const response = await fetch(url, {
    headers: { 'User-Agent': 'panier-malin/eans (script de maintenance)' },
  });
  if (!response.ok) throw new Error(`Open Prices : erreur ${response.status} pour ${url}`);
  const body = (await response.json()) as { items?: unknown[] };
  return (body.items ?? []).flatMap((item) => parseCandidate(item) ?? []);
}

async function main() {
  const catalog = (products as Product[]).filter((p) => !rayon || p.categoryId === rayon);
  const todo = catalog
    .flatMap((p) => p.references.filter((r) => !r.ean).map((r) => ({ product: p, ref: r })))
    .slice(0, limite);
  console.log(`${todo.length} références sans code-barres à examiner.`);
  const suggestions: Suggestion[] = [];
  for (const [i, { product, ref }] of todo.entries()) {
    const candidates: Candidate[] = [];
    for (const keyword of searchKeywords(product.name)) {
      candidates.push(...(await search(ref.brand, keyword)));
      await sleep(1000);
    }
    const ranked = rankCandidates(product, ref.enseigne, candidates);
    suggestions.push(...ranked);
    console.log(
      `[${i + 1}/${todo.length}] ${product.name}, ${ref.brand} : ${ranked.length} proposition(s)`,
    );
  }
  mkdirSync(sortie.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(sortie, toCsv(suggestions), 'utf8');
  console.log(`\n${suggestions.length} propositions écrites dans ${sortie}.`);
  console.log(
    'Relisez-les (photo et format sur Open Food Facts), écrivez « oui » dans la colonne « valider »,',
  );
  console.log('puis lancez : npm run eans:appliquer -- ' + sortie);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
