import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import products from '../src/data/products.json';
import { storeLabel } from '../src/services/stores';
import type { Product } from '../src/types/catalog';
import type { Store } from '../src/types/stores';
import { normalizeText } from '../src/utils/text';
import { validateCatalog } from '../src/services/catalogValidation';
import { applyCatalogueEdits, parseCatalogueMarkdown } from './lib/catalogueMarkdown';
import { formatProductsJson } from './lib/eanSuggestions';

// npm run catalogue:importer -- catalogue.md [--essai] [--sauvegarde sauvegarde.json]
const args = process.argv.slice(2).filter((a) => a !== '--');
const backupAt = args.indexOf('--sauvegarde');
const backupFile = backupAt >= 0 ? args[backupAt + 1] : undefined;
const file = args.find((a, i) => !a.startsWith('--') && (backupAt < 0 || i !== backupAt + 1));
const dryRun = args.includes('--essai');
if (!file) {
  console.error(
    'Usage : npm run catalogue:importer -- catalogue.md [--essai] [--sauvegarde sauvegarde.json]',
  );
  process.exit(1);
}

const parsed = parseCatalogueMarkdown(readFileSync(file, 'utf8'));
const result = applyCatalogueEdits(products as unknown as Product[], parsed);
const list = (title: string, items: string[]) => {
  if (items.length) console.log(`${title} (${items.length}) : ${items.join(', ')}`);
};
list('Ajoutés', result.added);
list('Modifiés', result.changed);
list('Retirés', result.removed);
for (const note of parsed.categoryNotes)
  console.log(`À reporter dans src/data/categories.ts : ${note}`);
result.errors.push(...validateCatalog(result.products));
if (result.errors.length) {
  console.error(`\n${result.errors.length} erreur(s), rien n'a été écrit :`);
  for (const e of result.errors) console.error(`- ${e}`);
  process.exit(1);
}
if (dryRun) {
  console.log('\nEssai : rien n’a été écrit.');
} else {
  const target = 'src/data/products.json';
  // Même présentation que le reste des outils : un produit par ligne.
  writeFileSync(target, formatProductsJson(result.products), 'utf8');
  console.log(
    `\n${target} mis à jour : ${result.products.length} produits. Lancez npm test pour vérifier le catalogue.`,
  );
}

if (result.prices.length) {
  const entries = result.prices.map(
    (p) => [p.productId, { cents: p.cents, per: p.per, date: parsed.date }] as const,
  );
  mkdirSync('scripts/out', { recursive: true });
  if (!backupFile) {
    writeFileSync(
      'scripts/out/prix-du-catalogue.json',
      JSON.stringify({ magasin: parsed.store, prix: Object.fromEntries(entries) }, null, 2),
    );
    console.log(
      `${entries.length} prix lus. Ajoutez --sauvegarde avec votre sauvegarde pour les rattacher à « ${parsed.store} ».`,
    );
  } else {
    // Sauvegarde exportée depuis « Magasins > Vos données » : tout est conservé, seuls les prix saisis changent.
    const snapshot = JSON.parse(readFileSync(backupFile, 'utf8')) as {
      app?: unknown;
      data?: Record<string, unknown>;
    };
    if (
      snapshot.app !== 'panier-malin' ||
      typeof snapshot.data !== 'object' ||
      snapshot.data === null
    ) {
      throw new Error(`${backupFile} n’est pas une sauvegarde Panier malin.`);
    }
    const stores = ((snapshot.data.magasins as { stores?: Store[] } | undefined)?.stores ??
      []) as Store[];
    // « Lidl Courbevoie » comme « Lidl, Courbevoie » : seules les lettres et les chiffres comptent.
    const key = (value: string) =>
      normalizeText(value)
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const wanted = key(parsed.store);
    const matches = stores.filter(
      (s) => key(storeLabel(s)).includes(wanted) || key(s.name) === wanted,
    );
    if (matches.length !== 1) {
      throw new Error(
        `Magasin « ${parsed.store} » ${matches.length ? 'ambigu' : 'introuvable'} ; magasins de la sauvegarde : ${stores.map(storeLabel).join(' ; ')}`,
      );
    }
    const store = matches[0]!;
    const manual = {
      ...((snapshot.data['prix:manuels'] as Record<string, unknown> | undefined) ?? {}),
    };
    for (const [productId, price] of entries) manual[`${productId}|${store.id}`] = price;
    snapshot.data['prix:manuels'] = manual;
    writeFileSync('scripts/out/sauvegarde-avec-prix.json', JSON.stringify(snapshot, null, 2));
    console.log(
      `${entries.length} prix ajoutés pour ${storeLabel(store)} dans scripts/out/sauvegarde-avec-prix.json, à importer dans « Magasins > Vos données ».`,
    );
  }
}
