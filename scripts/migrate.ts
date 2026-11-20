import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

loadEnvConfig(process.cwd());

/**
 * Applique les migrations dans le schéma « factureci » uniquement. Le journal des migrations est lui aussi
 * dans ce schéma : on ne touche jamais au schéma « drizzle » ni à « public », qu'une autre application
 * hébergée sur la même base peut utiliser.
 */
async function main() {
  // Connexion directe de préférence (les migrations n'ont pas besoin du pooler).
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante (voir .env.example).");
  const client = postgres(url, { max: 1, prepare: false });
  await client`create schema if not exists factureci`;
  await migrate(drizzle(client), { migrationsFolder: "./drizzle", migrationsSchema: "factureci", migrationsTable: "__drizzle_migrations" });
  await client.end();
  console.log("Migrations appliquées (schéma factureci).");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
