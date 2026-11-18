import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Utilisateur connecté, relu en base à chaque requête (un compte supprimé perd l'accès
 * immédiatement). Redirige vers la connexion sinon. À appeler dans chaque page et
 * chaque Server Action protégée : toutes les requêtes filtrent ensuite par user.id.
 */
export const requireUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/connexion");
  const [user] = await getDb()
    .select({ id: users.id, name: users.name, phone: users.phone, email: users.email, role: users.role, plan: users.plan, planExpiresAt: users.planExpiresAt, suspendedAt: users.suspendedAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  // Un compte supprimé ou suspendu perd l'accès immédiatement, même avec un cookie encore valide.
  if (!user || user.suspendedAt) redirect("/connexion");
  return user;
});

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/app");
  return user;
}
