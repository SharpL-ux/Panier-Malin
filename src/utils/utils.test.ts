import { describe, expect, it } from 'vitest';
import { defaultListName, formatFrDate, mondayOf } from './dates';
import { cleanEan, isValidEan } from './ean';
import { formatCents, parseEuroToCents, unitPriceCents } from './money';
import { matchesQuery, normalizeText, slugify } from './text';
import { formatPack, formatRefQuantity, isPackCompatible, refQuantity } from './units';

describe('texte', () => {
  it('ignore les accents, la casse et les ligatures', () => {
    expect(normalizeText('Crème Fraîche ÉPAISSE')).toBe('creme fraiche epaisse');
    expect(normalizeText('Œufs')).toBe('oeufs');
    expect(normalizeText("Pâte d'amande")).toBe('pate d amande');
  });

  it('trouve un produit quel que soit l’ordre des mots', () => {
    const haystack = normalizeText('Lait demi-écrémé UHT Lactel');
    expect(matchesQuery(haystack, 'lactel lait')).toBe(true);
    expect(matchesQuery(haystack, 'ECREME')).toBe(true);
    expect(matchesQuery(haystack, 'lait entier')).toBe(false);
    expect(matchesQuery(haystack, '   ')).toBe(true);
  });

  it('fabrique des identifiants lisibles', () => {
    expect(slugify("Carrefour Classic' Lait & Œufs")).toBe('carrefour-classic-lait-et-oeufs');
  });
});

describe('argent en centimes', () => {
  it('convertit sans erreur de virgule flottante', () => {
    expect(parseEuroToCents('1.29')).toBe(129);
    expect(parseEuroToCents('1,29')).toBe(129);
    expect(parseEuroToCents(1.29)).toBe(129);
    expect(parseEuroToCents(0.1 + 0.2)).toBe(30);
    expect(parseEuroToCents('2')).toBe(200);
    expect(parseEuroToCents('0.995')).toBe(100);
    expect(parseEuroToCents(19.99)).toBe(1999);
  });

  it('refuse les valeurs qui ne sont pas des prix', () => {
    expect(parseEuroToCents('')).toBeNull();
    expect(parseEuroToCents('abc')).toBeNull();
    expect(parseEuroToCents('-1')).toBeNull();
    expect(parseEuroToCents(null)).toBeNull();
    expect(parseEuroToCents(Number.NaN)).toBeNull();
  });

  it('formate en euros à la française', () => {
    expect(formatCents(129).replace(/\s/g, ' ')).toBe('1,29 €');
    expect(formatCents(123456).replace(/\s/g, ' ')).toBe('1 234,56 €');
  });

  it('calcule le prix unitaire arrondi au centime', () => {
    expect(unitPriceCents(595, 6)).toBe(99); // pack de 6 L à 5,95 € → 0,99 €/L
    expect(unitPriceCents(129, 0.5)).toBe(258);
    expect(unitPriceCents(100, 0)).toBeNull();
  });
});

describe('codes-barres', () => {
  it('valide la clé de contrôle EAN-13, EAN-8 et UPC-A', () => {
    expect(isValidEan('4006381333931')).toBe(true);
    expect(isValidEan('4006381333932')).toBe(false);
    expect(isValidEan('73513537')).toBe(true);
    expect(isValidEan('036000291452')).toBe(true);
    expect(isValidEan('12345')).toBe(false);
    expect(isValidEan('')).toBe(false);
  });

  it('nettoie les espaces et tirets saisis', () => {
    expect(cleanEan(' 400 6381-333931 ')).toBe('4006381333931');
    expect(isValidEan('4 006381 333931')).toBe(true);
  });
});

describe('unités et conditionnements', () => {
  it('ramène un conditionnement à son unité de référence', () => {
    expect(refQuantity({ count: 6, size: 1000, unit: 'ml' })).toBe(6);
    expect(refQuantity({ count: 6, size: 330, unit: 'ml' })).toBe(1.98);
    expect(refQuantity({ count: 4, size: 125, unit: 'g' })).toBe(0.5);
    expect(refQuantity({ count: 1, size: 12, unit: 'piece' })).toBe(12);
  });

  it('vérifie la compatibilité avec l’unité d’un groupe', () => {
    expect(isPackCompatible({ count: 1, size: 500, unit: 'g' }, 'kg')).toBe(true);
    expect(isPackCompatible({ count: 1, size: 500, unit: 'g' }, 'L')).toBe(false);
  });

  it('affiche les formats comme sur les étiquettes', () => {
    expect(formatPack({ count: 1, size: 1000, unit: 'ml' })).toBe('1 L');
    expect(formatPack({ count: 6, size: 1500, unit: 'ml' })).toBe('6 × 1,5 L');
    expect(formatPack({ count: 6, size: 330, unit: 'ml' })).toBe('6 × 33 cl');
    expect(formatPack({ count: 1, size: 150, unit: 'ml' })).toBe('15 cl');
    expect(formatPack({ count: 1, size: 75, unit: 'ml' })).toBe('75 ml');
    expect(formatPack({ count: 4, size: 125, unit: 'g' })).toBe('4 × 125 g');
    expect(formatPack({ count: 1, size: 2500, unit: 'g' })).toBe('2,5 kg');
    expect(formatPack({ count: 1, size: 12, unit: 'piece' })).toBe('12 pièces');
    expect(formatRefQuantity(1.5, 'kg')).toBe('1,5 kg');
    expect(formatRefQuantity(1, 'piece')).toBe('1 pièce');
  });
});

describe('dates', () => {
  it('trouve le lundi de la semaine, y compris le dimanche', () => {
    expect(mondayOf(new Date(2026, 8, 30))).toBe('2026-09-28'); // mercredi
    expect(mondayOf(new Date(2026, 9, 4))).toBe('2026-09-28'); // dimanche
    expect(mondayOf(new Date(2026, 8, 28))).toBe('2026-09-28'); // lundi
    expect(mondayOf(new Date(2026, 0, 1))).toBe('2025-12-29'); // changement d'année
  });

  it('nomme la liste à la française', () => {
    expect(formatFrDate('2026-09-28')).toBe('28/09/2026');
    expect(defaultListName('2026-09-28')).toBe('Semaine du 28/09/2026');
  });
});
