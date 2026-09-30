/** Normalise un texte pour la recherche : sans accents, sans casse, ligatures développées. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Vrai si chaque mot de la requête apparaît dans le texte (déjà normalisé). */
export function matchesQuery(normalizedHaystack: string, query: string): boolean {
  const tokens = normalizeText(query).split(' ').filter(Boolean);
  return tokens.every((token) => normalizedHaystack.includes(token));
}

export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
