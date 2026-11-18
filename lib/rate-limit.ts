import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db";

export type RateRule = { limit: number; windowSeconds: number };

export const RULES = {
  login: { limit: 10, windowSeconds: 15 * 60 } satisfies RateRule,
  loginIp: { limit: 60, windowSeconds: 15 * 60 } satisfies RateRule,
  signup: { limit: 5, windowSeconds: 60 * 60 } satisfies RateRule,
};

export type RateResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Compte une tentative et dit si elle est autorisée. Un seul UPSERT atomique en base :
 * pas de course entre deux requêtes simultanées, et la limite vaut pour toutes les instances.
 */
export async function hit(db: Db, key: string, rule: RateRule): Promise<RateResult> {
  const rows = await db.execute<{ count: number; retry: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${rule.windowSeconds}))
    on conflict (key) do update set
      count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at <= now() then now() + make_interval(secs => ${rule.windowSeconds}) else rate_limits.reset_at end
    returning count, greatest(1, ceil(extract(epoch from (reset_at - now()))))::int as retry
  `);
  const count = Number(rows[0].count);
  // Nettoyage occasionnel des compteurs expirés.
  if (Math.random() < 0.01) await db.execute(sql`delete from rate_limits where reset_at < now() - interval '1 day'`);
  return { allowed: count <= rule.limit, remaining: Math.max(0, rule.limit - count), retryAfterSeconds: Number(rows[0].retry) };
}

/** Adresse IP du client : en-tête posé par la plateforme (Vercel), sinon « unknown ». */
export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
