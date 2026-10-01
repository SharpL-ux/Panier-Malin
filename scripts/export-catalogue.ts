import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import products from '../src/data/products.json';
import type { Product } from '../src/types/catalog';
import { catalogueToMarkdown } from './lib/catalogueMarkdown';

// npm run catalogue:exporter -- [fichier.md]
const out =
  process.argv.slice(2).find((a) => a !== '--' && !a.startsWith('--')) ??
  'scripts/out/catalogue.md';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, catalogueToMarkdown(products as unknown as Product[], new Date()));
console.log(`Catalogue écrit dans ${out} (${products.length} produits).`);
