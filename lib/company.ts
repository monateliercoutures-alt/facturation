import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { companies } from "@/lib/db/schema";

/** Entreprise de l'utilisateur (toujours filtrée par user_id). */
export async function getCompanyForUser(userId: string) {
  const [company] = await getDb().select().from(companies).where(eq(companies.userId, userId)).limit(1);
  return company ?? null;
}
