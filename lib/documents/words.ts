/** Montant en lettres, orthographe française (règles de 1990 non appliquées : « vingt et un », « quatre-vingt-un »). */

const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** `final` : le nombre termine l'énoncé (donc « quatre-vingts », « deux cents » prennent leur s). */
function below1000(n: number, final: boolean): string {
  if (n < 20) return UNITS[n];
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return TENS[t] + (u === 0 ? "" : u === 1 ? " et un" : `-${UNITS[u]}`);
  }
  if (n < 80) {
    const u = n - 60;
    return u === 11 ? "soixante et onze" : `soixante-${UNITS[u]}`;
  }
  if (n < 100) {
    const u = n - 80;
    return u === 0 ? (final ? "quatre-vingts" : "quatre-vingt") : `quatre-vingt-${UNITS[u]}`;
  }
  const c = Math.floor(n / 100);
  const r = n % 100;
  const head = c === 1 ? "cent" : `${UNITS[c]} cent`;
  if (r === 0) return c > 1 && final ? `${head}s` : head;
  return `${head} ${below1000(r, final)}`;
}

const SCALES: [number, string, string][] = [
  [1_000_000_000_000, "billion", "billions"],
  [1_000_000_000, "milliard", "milliards"],
  [1_000_000, "million", "millions"],
];

export function numberToFrench(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new RangeError("Montant invalide.");
  const n = Math.round(value);
  if (n === 0) return "zéro";
  const parts: string[] = [];
  let rest = n;
  for (const [size, one, many] of SCALES) {
    const q = Math.floor(rest / size);
    if (q > 0) {
      parts.push(`${numberToFrench(q)} ${q > 1 ? many : one}`);
      rest %= size;
    }
  }
  const thousands = Math.floor(rest / 1000);
  const units = rest % 1000;
  if (thousands > 0) {
    // « mille » est invariable ; « cent » et « vingt » ne prennent pas de s devant lui.
    parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  }
  if (units > 0) parts.push(below1000(units, true));
  return parts.join(" ");
}

export function amountSentence(amount: number): string {
  return `Arrêté à la somme de : ${numberToFrench(amount)} francs CFA.`;
}
