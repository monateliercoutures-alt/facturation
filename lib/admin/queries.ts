import "server-only";
import { count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminActions, documents, paymentRequests, users } from "@/lib/db/schema";
import { computeAdminStats } from "@/lib/admin/stats";
import { normalizePhone } from "@/lib/phone";

export async function getAdminStats(now = new Date()) {
  const db = getDb();
  const [all, active] = await Promise.all([
    db.select({ plan: users.plan, planExpiresAt: users.planExpiresAt, createdAt: users.createdAt, role: users.role }).from(users),
    db
      .select({ n: sql<number>`count(distinct ${documents.userId})` })
      .from(documents)
      .where(gte(documents.createdAt, new Date(now.getTime() - 30 * 86_400_000))),
  ]);
  return computeAdminStats(all, Number(active[0]?.n ?? 0), now);
}

export async function listPendingRequests() {
  return getDb()
    .select({ request: paymentRequests, userName: users.name, userPhone: users.phone })
    .from(paymentRequests)
    .innerJoin(users, eq(users.id, paymentRequests.userId))
    .where(eq(paymentRequests.status, "pending"))
    .orderBy(paymentRequests.createdAt);
}

export async function listAdminUsers(search: string | undefined, limit = 100) {
  const q = search?.trim();
  const phone = q ? normalizePhone(q) : null;
  // Recherche par nom, ou par téléphone si la saisie contient des chiffres (jamais de motif vide qui sélectionnerait tout).
  const digits = q ? q.replace(/\D/g, "") : "";
  const escaped = q ? q.replace(/[%_\\]/g, "\\$&") : "";
  const filter = q ? or(ilike(users.name, `%${escaped}%`), phone ? eq(users.phone, phone) : undefined, digits.length >= 3 ? ilike(users.phone, `%${digits}%`) : undefined) : undefined;
  return getDb()
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      role: users.role,
      plan: users.plan,
      planExpiresAt: users.planExpiresAt,
      suspendedAt: users.suspendedAt,
      createdAt: users.createdAt,
      documents: count(documents.id),
    })
    .from(users)
    .leftJoin(documents, eq(documents.userId, users.id))
    .where(filter)
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function listAdminActions(limit = 50) {
  const target = getDb().$with("t").as(getDb().select({ id: users.id, name: users.name }).from(users));
  return getDb()
    .with(target)
    .select({ action: adminActions, adminName: users.name, targetName: target.name })
    .from(adminActions)
    .innerJoin(users, eq(users.id, adminActions.adminId))
    .leftJoin(target, eq(target.id, adminActions.targetUserId))
    .orderBy(desc(adminActions.createdAt))
    .limit(limit);
}

