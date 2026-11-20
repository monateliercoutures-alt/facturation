import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/factureci" },
  // Uniquement notre schéma ; le journal des migrations y reste aussi (jamais dans « drizzle », qu'une autre appli peut utiliser).
  schemaFilter: ["factureci"],
  migrations: { schema: "factureci", table: "__drizzle_migrations" },
  strict: true,
});
