/**
 * Numéros de téléphone. Côte d'Ivoire : 10 chiffres depuis 2021 (07 00 00 00 00).
 * Forme stockée : +225 suivi des 10 chiffres, sans espace (+2250700000000).
 */

const CI_PREFIX = "225";

/** Normalise un numéro saisi. Renvoie null si le numéro n'est pas valide. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 10) digits = CI_PREFIX + digits;
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith(CI_PREFIX)) {
    return digits.length === 13 ? `+${digits}` : null;
  }
  // Autres pays (Afrique de l'Ouest et au-delà) : format international E.164.
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

/** Affichage lisible : +225 07 00 00 00 00. */
export function formatPhone(phone: string): string {
  const m = /^\+225(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+225 ${m.slice(1).join(" ")}` : phone;
}

/** Liste des numéros admin (variable ADMIN_PHONES), normalisés. */
export function adminPhones(raw = process.env.ADMIN_PHONES ?? ""): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((p) => normalizePhone(p.trim()))
      .filter((p): p is string => p !== null),
  );
}

export function isAdminPhone(phone: string, raw?: string): boolean {
  return adminPhones(raw).has(phone);
}
