import { execSync } from "node:child_process";

/**
 * Étape de build Vercel (script « vercel-build »). En production seulement : crée / met à jour les tables
 * du schéma « factureci », puis crée le compte admin si SEED_ADMIN_* est défini. Les déploiements de
 * prévisualisation ne touchent jamais à la base.
 */
if (process.env.VERCEL_ENV !== "production") {
  console.log(`Environnement « ${process.env.VERCEL_ENV ?? "local"} » : migrations ignorées.`);
  process.exit(0);
}
if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  console.error("DATABASE_URL absente : impossible de préparer la base.");
  process.exit(1);
}
// Démantèlement : supprime le schéma « factureci » et ne recrée rien (ni tables ni compte admin).
if (process.env.DROP_FACTURECI_SCHEMA === "yes") {
  execSync("npx tsx scripts/drop-schema.ts", { stdio: "inherit" });
  process.exit(0);
}
execSync("npx tsx scripts/migrate.ts", { stdio: "inherit" });
if (process.env.SEED_ADMIN_PHONE && process.env.SEED_ADMIN_PASSWORD) {
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
} else {
  console.log("SEED_ADMIN_* absent : création du compte admin ignorée.");
}
