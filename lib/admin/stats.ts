export type AdminUserRow = { createdAt: Date; role?: "user" | "admin" };

export type AdminStats = {
  total: number;
  newThisWeek: number;
  active30: number;
};

/** `activeCount` : utilisateurs ayant créé au moins un document sur les 30 derniers jours. */
export function computeAdminStats(users: AdminUserRow[], activeCount: number, now = new Date()): AdminStats {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  return {
    total: users.length,
    newThisWeek: users.filter((u) => u.createdAt >= weekAgo).length,
    active30: activeCount,
  };
}
