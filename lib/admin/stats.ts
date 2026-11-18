import { isPaidActive, PLAN_PRICES, type PlanKey } from "@/lib/plans";

export type AdminUserRow = { plan: PlanKey; planExpiresAt: Date | null; createdAt: Date; role?: "user" | "admin" };

export type AdminStats = {
  total: number;
  newThisWeek: number;
  active30: number;
  byPlan: Record<PlanKey, number>;
  /** Revenu mensuel récurrent : somme des prix des plans payants encore actifs. */
  mrr: number;
  /** Part des utilisateurs sur un plan payant actif (gratuit → payant), en %. */
  conversionRate: number | null;
};

/** `activeUserIds` : utilisateurs ayant créé au moins un document sur les 30 derniers jours. */
export function computeAdminStats(users: AdminUserRow[], activeCount: number, now = new Date()): AdminStats {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const byPlan: Record<PlanKey, number> = { free: 0, pro: 0, business: 0 };
  let mrr = 0;
  let paying = 0;
  const customers = users.filter((u) => u.role !== "admin").length;
  for (const u of users) {
    // Les comptes administrateurs ne sont pas des clients : ni abonnés, ni revenu.
    if (u.role === "admin") continue;
    if (isPaidActive(u, now)) {
      byPlan[u.plan]++;
      mrr += PLAN_PRICES[u.plan];
      paying++;
    } else {
      byPlan.free++;
    }
  }
  return {
    total: users.length,
    newThisWeek: users.filter((u) => u.createdAt >= weekAgo).length,
    active30: activeCount,
    byPlan,
    mrr,
    conversionRate: customers ? Math.round((paying / customers) * 100) : null,
  };
}
