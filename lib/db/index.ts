import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __factureciDb?: Db };

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante : copiez .env.example en .env.local et renseignez-la.");
  // prepare: false — compatible avec le pooler de Neon (PgBouncer en mode transaction).
  const client = postgres(url, { prepare: false, max: process.env.NODE_ENV === "production" ? 5 : 10 });
  return drizzle(client, { schema });
}

/** Connexion unique, réutilisée entre les rechargements à chaud et les invocations serverless. */
export function getDb(): Db {
  if (!globalForDb.__factureciDb) globalForDb.__factureciDb = createDb();
  return globalForDb.__factureciDb;
}

export type { Db };
export { schema };
