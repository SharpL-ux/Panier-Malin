/** Nettoie une saisie de code-barres (espaces, tirets). */
export function cleanEan(value: string): string {
  return value.replace(/[\s-]/g, '');
}

/**
 * Vérifie un code EAN-8, UPC-A (12) ou EAN-13 avec sa clé de contrôle.
 * La clé détecte les fautes de frappe, mais ne prouve pas que le code existe :
 * seuls Open Food Facts et Open Prices peuvent le confirmer.
 */
export function isValidEan(value: string): boolean {
  const code = cleanEan(value);
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
