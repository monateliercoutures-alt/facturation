import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { companies, users, type PaymentNumbers } from "../lib/db/schema";
import { companySchema } from "../lib/validation";
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
  // Ne réécrit pas le mot de passe d'un compte existant (le seed tourne à chaque déploiement de production),
  // sauf demande explicite SEED_ADMIN_RESET=yes (mot de passe oublié : redéployer avec cette variable, puis la retirer).
  await db
    .insert(users)
    .values({ phone, name: SEED_ADMIN_NAME || "Administrateur", passwordHash, role: "admin" })
    .onConflictDoUpdate({ target: users.phone, set: process.env.SEED_ADMIN_RESET === "yes" ? { role: "admin", passwordHash } : { role: "admin" } });
  // Profil société optionnel (variable SEED_COMPANY, JSON). Créé seulement s'il n'existe pas : jamais réécrit.
  if (process.env.SEED_COMPANY) {
    const parsed = companySchema.safeParse(JSON.parse(process.env.SEED_COMPANY));
    if (!parsed.success) throw new Error(`SEED_COMPANY invalide : ${parsed.error.issues[0]?.message}`);
    const d = parsed.data;
    const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    const paymentNumbers: PaymentNumbers = {};
    if (d.wave) paymentNumbers.wave = d.wave;
    if (d.orangeMoney) paymentNumbers.orangeMoney = d.orangeMoney;
    if (d.mtnMoney) paymentNumbers.mtnMoney = d.mtnMoney;
    if (d.moovMoney) paymentNumbers.moovMoney = d.moovMoney;
    await db
      .insert(companies)
      .values({ userId: admin.id, name: d.name, rccm: d.rccm, taxNumber: d.taxNumber, address: d.address, phone: d.phone, email: d.email, website: d.website, tagline: d.tagline, bankDetails: d.bankDetails, defaultNote: d.defaultNote, paymentNumbers })
      .onConflictDoNothing({ target: companies.userId });
    console.log("Profil société prêt.");
  }
  await client.end();
  console.log(`Compte admin prêt : ${phone} (mot de passe inchangé s'il existait déjà)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
