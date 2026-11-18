import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

loadEnvConfig(process.cwd());

// Test d'intégration : nécessite DATABASE_URL (base de développement migrée). Ignoré sinon.
const run = process.env.DATABASE_URL ? describe : describe.skip;

run("nextDocumentNumber (base réelle)", () => {
  let userA = "";
  let userB = "";
  let db: typeof import("@/lib/db").getDb extends () => infer R ? R : never;
  let nextDocumentNumber: typeof import("@/lib/numbering").nextDocumentNumber;
  let users: typeof import("@/lib/db/schema").users;

  beforeAll(async () => {
    const dbMod = await import("@/lib/db");
    ({ nextDocumentNumber } = await import("@/lib/numbering"));
    ({ users } = await import("@/lib/db/schema"));
    db = dbMod.getDb();
    const rows = await db
      .insert(users)
      .values([
        { phone: `+2259${Date.now().toString().slice(-9)}`, name: "Test A", passwordHash: "x" },
        { phone: `+2258${Date.now().toString().slice(-9)}`, name: "Test B", passwordHash: "x" },
      ])
      .returning({ id: users.id });
    userA = rows[0].id;
    userB = rows[1].id;
  });

  afterAll(async () => {
    if (userA) await db.delete(users).where(eq(users.id, userA));
    if (userB) await db.delete(users).where(eq(users.id, userB));
  });

  it("ne produit aucun doublon sous 20 créations simultanées", async () => {
    const numbers = await Promise.all(Array.from({ length: 20 }, () => db.transaction((tx) => nextDocumentNumber(tx, userA, "FAC", 2026))));
    expect(new Set(numbers).size).toBe(20);
    expect(numbers).toContain("FAC-2026-001");
    expect(numbers).toContain("FAC-2026-020");
  });

  it("compte séparément par utilisateur, type et année", async () => {
    expect(await db.transaction((tx) => nextDocumentNumber(tx, userB, "FAC", 2026))).toBe("FAC-2026-001");
    expect(await db.transaction((tx) => nextDocumentNumber(tx, userA, "DEV", 2026))).toBe("DEV-2026-001");
    expect(await db.transaction((tx) => nextDocumentNumber(tx, userA, "FAC", 2027))).toBe("FAC-2027-001");
  });

  it("rend le numéro si la transaction est annulée", async () => {
    await expect(
      db.transaction(async (tx) => {
        await nextDocumentNumber(tx, userA, "BL", 2026);
        throw new Error("annulée");
      }),
    ).rejects.toThrow();
    expect(await db.transaction((tx) => nextDocumentNumber(tx, userA, "BL", 2026))).toBe("BL-2026-001");
  });
});
