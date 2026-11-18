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
