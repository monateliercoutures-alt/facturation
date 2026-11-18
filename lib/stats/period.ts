/** Périodes du tableau de bord, en dates civiles Africa/Abidjan (UTC+0, sans heure d'été). Bornes incluses. */

export const PERIOD_KEYS = ["today", "7d", "month", "last-month", "year", "custom"] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Aujourd'hui",
  "7d": "7 jours",
  month: "Ce mois",
  "last-month": "Mois dernier",
  year: "Cette année",
  custom: "Personnalisé",
};

export type Period = { key: PeriodKey; from: string; to: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export function addDays(iso: string, days: number): string {
  const { y, m, d } = parts(iso);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return toISO(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function isIsoDate(value: string | undefined | null): value is string {
  if (!value || !ISO.test(value)) return false;
  const { y, m, d } = parts(value);
  return m >= 1 && m <= 12 && d >= 1 && d <= lastDayOfMonth(y, m);
}

/** Résout une période. `from`/`to` ne servent que pour « custom » ; une saisie invalide retombe sur « Ce mois ». */
export function resolvePeriod(key: string | undefined, today: string, from?: string, to?: string): Period {
  const { y, m } = parts(today);
  switch (key) {
    case "today":
      return { key: "today", from: today, to: today };
    case "7d":
      return { key: "7d", from: addDays(today, -6), to: today };
    case "last-month": {
      const ly = m === 1 ? y - 1 : y;
      const lm = m === 1 ? 12 : m - 1;
      return { key: "last-month", from: toISO(ly, lm, 1), to: toISO(ly, lm, lastDayOfMonth(ly, lm)) };
    }
    case "year":
      return { key: "year", from: toISO(y, 1, 1), to: toISO(y, 12, 31) };
    case "custom":
      if (isIsoDate(from) && isIsoDate(to) && from <= to) return { key: "custom", from, to };
      return resolvePeriod("month", today);
    default:
      return { key: "month", from: toISO(y, m, 1), to: toISO(y, m, lastDayOfMonth(y, m)) };
  }
}

/** Mois (aaaa-mm) des 12 derniers mois, le plus ancien d'abord, le mois courant en dernier. */
export function last12Months(today: string): string[] {
  const { y, m } = parts(today);
  return Array.from({ length: 12 }, (_, i) => {
    const idx = y * 12 + (m - 1) - (11 - i);
    return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
  });
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

/** Date (aaaa-mm-jj) d'un instant, dans le fuseau Africa/Abidjan. */
export function dateOf(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan", year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

export function daysBetween(fromISO: string, toISO_: string): number {
  const a = parts(fromISO);
  const b = parts(toISO_);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}
