import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../lib/db/schema";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../lib/password";
import { normalizePhone } from "../lib/phone";

loadEnvConfig(process.cwd());

async function main() {
  const { DATABASE_URL, SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } = process.env;
  if (!DATABASE_URL) throw new Error("DATABASE_URL manquante.");
  const phone = normalizePhone(SEED_ADMIN_PHONE ?? "");
  if (!phone) throw new Error("SEED_ADMIN_PHONE manquant ou invalide.");
  if (!SEED_ADMIN_PASSWORD || SEED_ADMIN_PASSWORD.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`SEED_ADMIN_PASSWORD manquant (${PASSWORD_MIN_LENGTH} caractères minimum).`);
  }
  const client = postgres(process.env.DATABASE_URL_UNPOOLED || DATABASE_URL, { max: 1, prepare: false });
  const db = drizzle(client);
  const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD);
  // Ne réécrit jamais le mot de passe d'un compte existant (le seed tourne à chaque déploiement de production) :
  // pour le changer, utilisez « npm run admin:reset-password » ou la page /admin.
  await db
    .insert(users)
    .values({ phone, name: SEED_ADMIN_NAME || "Administrateur", passwordHash, role: "admin", plan: "business" })
    .onConflictDoUpdate({ target: users.phone, set: { role: "admin" } });
  await client.end();
  console.log(`Compte admin prêt : ${phone} (mot de passe inchangé s'il existait déjà)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
