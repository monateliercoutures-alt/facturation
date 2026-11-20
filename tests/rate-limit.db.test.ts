import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

loadEnvConfig(process.cwd());
const run = process.env.DATABASE_URL ? describe : describe.skip;

run("limitation de débit (base réelle)", () => {
  const key = `test:${Date.now()}`;
  afterAll(async () => {
    const { getDb } = await import("@/lib/db");
    await getDb().execute(sql`delete from factureci.rate_limits where key like 'test:%'`);
  });

  it("autorise jusqu'à la limite puis bloque, même sous requêtes simultanées", async () => {
    const { getDb } = await import("@/lib/db");
    const { hit } = await import("@/lib/rate-limit");
    const db = getDb();
    const results = await Promise.all(Array.from({ length: 15 }, () => hit(db, key, { limit: 10, windowSeconds: 60 })));
    expect(results.filter((r) => r.allowed)).toHaveLength(10);
    expect(results.filter((r) => !r.allowed)).toHaveLength(5);
    const blocked = await hit(db, key, { limit: 10, windowSeconds: 60 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("repart à zéro quand la fenêtre est écoulée", async () => {
    const { getDb } = await import("@/lib/db");
    const { hit } = await import("@/lib/rate-limit");
    const db = getDb();
    const k = `${key}:expire`;
    await hit(db, k, { limit: 1, windowSeconds: 60 });
    expect((await hit(db, k, { limit: 1, windowSeconds: 60 })).allowed).toBe(false);
    await db.execute(sql`update factureci.rate_limits set reset_at = now() - interval '1 second' where key = ${k}`);
    expect((await hit(db, k, { limit: 1, windowSeconds: 60 })).allowed).toBe(true);
  });
});
