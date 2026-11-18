import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../lib/db/schema";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../lib/password";
import { normalizePhone } from "../lib/phone";

loadEnvConfig(process.cwd());

/** Usage : npm run admin:reset-password -- 0700000000 NouveauMotDePasse */
async function main() {
  const [rawPhone, password] = process.argv.slice(2);
  const phone = normalizePhone(rawPhone ?? "");
  if (!phone || !password || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Usage : npm run admin:reset-password -- <téléphone> <nouveau mot de passe (${PASSWORD_MIN_LENGTH}+ caractères)>`);
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquante.");
  const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  const updated = await drizzle(client)
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.phone, phone))
    .returning({ id: users.id });
  await client.end();
  if (updated.length === 0) throw new Error(`Aucun compte pour ${phone}.`);
  console.log(`Mot de passe réinitialisé pour ${phone}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
