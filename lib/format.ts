export const TIME_ZONE = "Africa/Abidjan";

/** 60000 → « 60 000 FCFA » (espace comme séparateur, sans décimales). */
export function formatAmount(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${digits}`;
}

export function formatFCFA(amount: number): string {
  return `${formatAmount(amount)} FCFA`;
}

/** Date au format jj/mm/aaaa, dans le fuseau Africa/Abidjan. */
export function formatDate(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

/** Année courante dans le fuseau Africa/Abidjan (UTC+0, sans heure d'été). */
export function currentYear(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric" }).format(now));
}
