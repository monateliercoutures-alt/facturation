import postgres from "postgres";

/**
 * Suppression définitive du schéma « factureci » (et de lui seul). Réservé au démantèlement :
 * déclenché par predeploy.ts quand DROP_FACTURECI_SCHEMA=yes. Le nom est écrit en dur : aucun autre
 * schéma de la base (par exemple celui d'une autre application) n'est jamais touché.
 */
async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante.");
  const sql = postgres(url, { max: 1, prepare: false });
  await sql`drop schema if exists factureci cascade`;
  const left = await sql<{ schema_name: string }[]>`select schema_name from information_schema.schemata where schema_name = 'factureci'`;
  console.log(left.length === 0 ? "Schéma factureci supprimé." : "ATTENTION : le schéma factureci existe encore.");
  await sql.end();
  if (left.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
