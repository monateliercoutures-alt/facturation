import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import type { DocumentType } from "@/lib/db/schema";

/** FAC-2026-001 : trois chiffres minimum, davantage au-delà de 999. */
export function formatDocumentNumber(type: DocumentType, year: number, n: number): string {
  return `${type}-${year}-${String(n).padStart(3, "0")}`;
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Réserve le numéro suivant pour (utilisateur, type, année).
 * À appeler dans la transaction qui crée le document : l'UPSERT verrouille la ligne
 * du compteur jusqu'au commit, deux créations simultanées ne peuvent donc pas obtenir
 * le même numéro, et un rollback rend le numéro.
 */
export async function nextDocumentNumber(tx: Tx | Db, userId: string, type: DocumentType, year: number): Promise<string> {
  const rows = await tx.execute<{ last_number: number }>(sql`
    insert into counters (user_id, type, year, last_number)
    values (${userId}, ${type}, ${year}, 1)
    on conflict (user_id, type, year)
    do update set last_number = counters.last_number + 1
    returning last_number
  `);
  const last = Number(rows[0]?.last_number);
  return formatDocumentNumber(type, year, last);
}
