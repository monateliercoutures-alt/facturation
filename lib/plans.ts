export type PlanKey = "free" | "pro" | "business";

export const PLAN_LABELS: Record<PlanKey, string> = { free: "Gratuit", pro: "Pro", business: "Business" };

/** Prix mensuels en FCFA. */
export const PLAN_PRICES: Record<PlanKey, number> = { free: 0, pro: 4900, business: 9900 };

export const PLAN_DURATION_DAYS = 30;

/** Un plan payant n'est actif que tant que sa date d'expiration n'est pas dépassée. */
export function isPaidActive(user: { plan: PlanKey; planExpiresAt: Date | null }, now = new Date()): boolean {
  return user.plan !== "free" && (user.planExpiresAt === null || user.planExpiresAt > now);
}

/** Nouvelle expiration : +30 jours, ou prolongation de 30 jours si le même plan est encore actif. */
export function nextExpiry(current: { plan: PlanKey; planExpiresAt: Date | null }, newPlan: PlanKey, now = new Date()): Date {
  const base = current.plan === newPlan && current.planExpiresAt && current.planExpiresAt > now ? current.planExpiresAt : now;
  return new Date(base.getTime() + PLAN_DURATION_DAYS * 86_400_000);
}

export type PlanFeatures = {
  documentsPerMonth: number;
  /** Taille maximale du carnet de clients. */
  clients: number;
  logo: boolean;
  /** Mention « Créé avec FactureCI » sur les PDF. */
  pdfMention: boolean;
  email: boolean;
  fullDashboard: boolean;
  whatsappReminders: boolean;
  csvExport: boolean;
  users: number;
};

/**
 * Droits de chaque plan. Les limites de carnet de clients (20 / 100 / illimité) ne figurent pas dans
 * le cahier des charges, qui dit seulement « illimité » pour Business : à ajuster ici.
 */
export const PLAN_FEATURES: Record<PlanKey, PlanFeatures> = {
  free: { documentsPerMonth: 5, clients: 20, logo: false, pdfMention: true, email: false, fullDashboard: false, whatsappReminders: false, csvExport: false, users: 1 },
  pro: { documentsPerMonth: Infinity, clients: 100, logo: true, pdfMention: false, email: true, fullDashboard: true, whatsappReminders: true, csvExport: false, users: 1 },
  business: { documentsPerMonth: Infinity, clients: Infinity, logo: true, pdfMention: false, email: true, fullDashboard: true, whatsappReminders: true, csvExport: true, users: 3 },
};

/**
 * Plan réellement appliqué : à l'expiration on retombe sur Gratuit sans rien supprimer.
 * Les administrateurs ne sont jamais limités.
 */
export function effectivePlan(user: { plan: PlanKey; planExpiresAt: Date | null; role?: "user" | "admin" }, now = new Date()): PlanKey {
  if (user.role === "admin") return "business";
  return isPaidActive(user, now) ? user.plan : "free";
}

export const MENTION_TEXT = "Créé avec FactureCI";

/** Jours restants avant l'expiration d'un plan payant actif (arrondi au jour supérieur), sinon null. */
export function daysUntilExpiry(user: { plan: PlanKey; planExpiresAt: Date | null }, now = new Date()): number | null {
  if (user.plan === "free" || !user.planExpiresAt || user.planExpiresAt <= now) return null;
  return Math.ceil((user.planExpiresAt.getTime() - now.getTime()) / 86_400_000);
}

export const REMINDER_DAYS = 5;

export const FEATURE_LABELS = {
  documents: "Documents illimités",
  logo: "Votre logo",
  email: "Envoi par e-mail",
  dashboard: "Tableau de bord complet",
  reminders: "Relances WhatsApp",
  csv: "Export CSV",
  clients: "Carnet de clients illimité",
} as const;
