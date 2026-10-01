/**
 * Applique au catalogue les codes-barres validés dans le fichier de relecture
 * (colonne « valider » = oui), puis vérifie le catalogue avant d'écrire products.json.
 *
 *   npm run eans:appliquer -- scripts/out/propositions-eans.csv
 */
import { readFileSync, writeFileSync } from 'node:fs';
import products from '../src/data/products.json';
import { validateCatalog } from '../src/services/catalogValidation';
import type { Product } from '../src/types/catalog';
import { applyValidated, formatProductsJson, parseCsv } from './lib/eanSuggestions';

const file = process.argv[2];
if (!file) {
  console.error(
    'Indiquez le fichier relu : npm run eans:appliquer -- chemin/vers/propositions.csv',
  );
  process.exit(1);
}

const result = applyValidated(products as Product[], parseCsv(readFileSync(file, 'utf8')));
for (const error of result.errors) console.error(error);
const problems = validateCatalog(result.products);
if (result.errors.length > 0 || problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error('\nRien n’a été écrit : corrigez le fichier puis relancez.');
  process.exit(1);
}
writeFileSync('src/data/products.json', formatProductsJson(result.products), 'utf8');
console.log(
  `${result.applied.length} code(s)-barres ajouté(s) au catalogue. Lancez « npm test » puis proposez la modification.`,
);
