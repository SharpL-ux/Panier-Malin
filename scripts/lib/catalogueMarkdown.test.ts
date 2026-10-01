import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import products from '../../src/data/products.json';
import type { Product } from '../../src/types/catalog';
import {
  applyCatalogueEdits,
  catalogueToMarkdown,
  parseCatalogueMarkdown,
  parsePack,
  sortByAisle,
} from './catalogueMarkdown';
import { formatProductsJson } from './eanSuggestions';

const catalogue = products as unknown as Product[];
const markdown = catalogueToMarkdown(catalogue, new Date(2026, 9, 1));
const edit = (text: string) => applyCatalogueEdits(catalogue, parseCatalogueMarkdown(text));
const rowOf = (id: string) => markdown.split('\n').find((l) => l.endsWith(`| ${id} |`))!;
const cellsOf = (row: string) =>
  row
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
const rowFrom = (cells: string[]) => `| ${cells.join(' | ')} |`;

describe('catalogue en Markdown', () => {
  it('fait l’aller-retour sans rien perdre', () => {
    const result = edit(markdown);
    expect(result.errors).toEqual([]);
    expect(result).toMatchObject({ added: [], removed: [], changed: [], prices: [] });
    expect(result.products).toEqual(sortByAisle(catalogue));
    // Le fichier réécrit est identique, octet pour octet, à celui du dépôt.
    expect(formatProductsJson(result.products)).toBe(
      readFileSync('src/data/products.json', 'utf8'),
    );
  });

  it('lit les formats usuels', () => {
    expect(parsePack('1,5 kg')).toEqual({ count: 1, size: 1500, unit: 'g' });
    expect(parsePack('6 x 1 L')).toEqual({ count: 6, size: 1000, unit: 'ml' });
    expect(parsePack('33 cl')).toEqual({ count: 1, size: 330, unit: 'ml' });
    expect(parsePack('12 pièces')).toEqual({ count: 1, size: 12, unit: 'piece' });
    expect(parsePack('un sac')).toBeNull();
  });

  it('intègre les ajouts, modifications, suppressions et prix', () => {
    const bananes = cellsOf(rowOf('bananes'));
    bananes[1] = 'Bananes bio';
    bananes[5] = '1,99';
    const kakis = rowFrom(['🟠', 'Kakis', 'au poids', '', '', '2,49 €', '']);
    const text = markdown
      .replace(rowOf('bananes'), `${rowFrom(bananes)}\n${kakis}`)
      .replace(`${rowOf('pommes')}\n`, '')
      .replace('- Magasin de ces prix : ', '- Magasin de ces prix : Lidl Courbevoie')
      .replace('- Date des prix (JJ/MM/AAAA) : ', '- Date des prix (JJ/MM/AAAA) : 26/09/2026');
    const parsed = parseCatalogueMarkdown(text);
    const result = applyCatalogueEdits(catalogue, parsed);
    expect(result.errors).toEqual([]);
    expect(parsed).toMatchObject({ store: 'Lidl Courbevoie', date: '2026-09-26' });
    expect(result.added).toEqual(['Kakis']);
    expect(result.removed).toEqual(['Pommes']);
    expect(result.changed).toEqual(['Bananes bio']);
    expect(result.products.find((p) => p.id === 'kakis')).toMatchObject({
      categoryId: 'fruits',
      soldByWeight: true,
      references: [],
    });
    expect(result.prices).toEqual([
      { productId: 'bananes', cents: 199, per: 'kg' },
      { productId: 'kakis', cents: 249, per: 'kg' },
    ]);
  });

  it('garde un code-barres tant que la marque ne change pas', () => {
    const withRef = catalogue.find((p) => p.references.length > 0)!;
    const coded = catalogue.map((p) =>
      p.id === withRef.id
        ? {
            ...p,
            references: p.references.map((r, i) => (i === 0 ? { ...r, ean: '3017620422003' } : r)),
          }
        : p,
    );
    const first = withRef.references[0]!;
    const same = applyCatalogueEdits(
      coded,
      parseCatalogueMarkdown(catalogueToMarkdown(coded, new Date())),
    );
    expect(same.products.find((p) => p.id === withRef.id)!.references[0]!.ean).toBe(
      '3017620422003',
    );
    const renamed = catalogueToMarkdown(coded, new Date()).replace(
      ` : ${first.brand}`,
      ' : Autre marque',
    );
    const changed = applyCatalogueEdits(coded, parseCatalogueMarkdown(renamed));
    expect(changed.products.find((p) => p.id === withRef.id)!.references[0]).toMatchObject({
      brand: 'Autre marque',
      ean: '',
    });
  });

  it('signale les erreurs sans rien intégrer', () => {
    const bananes = rowOf('bananes');
    const broken = markdown
      .replace(bananes, bananes.replace('| au poids |', '| un sac |'))
      .replace(
        rowOf('pommes'),
        `${rowOf('pommes')}\n| 🍏 | Pommes vertes | 1 kg | | Auchan : Pouce | | |\n| 🍎 | Copie | 1 kg | | | | pommes |\n| 🍋 | Citrons | 1 kg | | | | inconnu |`,
      )
      .replace(
        '| Prix (€) | id |\n| --- | --- | --- | --- | --- | --- | --- |\n| 🍌',
        '| Prix (€) | id |\n| --- | --- | --- | --- | --- | --- | --- |\n| 🍌',
      )
      .replace('## 🥕 Légumes\n<!-- rayon: legumes -->', '## 🥕 Légumes du jardin');
    const result = edit(broken);
    expect(result.errors.join('\n')).toMatch(/format « un sac » non reconnu/);
    expect(result.errors.join('\n')).toMatch(/« Auchan : Pouce » doit s'écrire/);
    expect(result.errors.join('\n')).toMatch(/« pommes » apparaît deux fois/);
    expect(result.errors.join('\n')).toMatch(/id inconnu « inconnu »/);
    expect(result.errors.join('\n')).toMatch(/rayon inconnu « Légumes du jardin »/);
  });
});
