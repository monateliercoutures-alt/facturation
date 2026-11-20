"use server";

import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { adminActions, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/session";

const uuid = /^[0-9a-f-]{36}$/i;

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function log(tx: Db | Tx, adminId: string, action: string, targetUserId: string | null, details: Record<string, string | number | null> = {}) {
  await tx.insert(adminActions).values({ adminId, action, targetUserId, details });
}

export async function setSuspendedAction(userId: string, suspend: boolean) {
  const admin = await requireAdmin();
  // Un admin ne peut pas se suspendre lui-même (risque de se couper l'accès).
  if (!uuid.test(userId) || userId === admin.id) return;
  const db = getDb();
  const updated = await db.update(users).set({ suspendedAt: suspend ? new Date() : null }).where(eq(users.id, userId)).returning({ id: users.id });
  if (updated.length) await log(db, admin.id, suspend ? "user.suspended" : "user.reactivated", userId);
  revalidatePath("/admin");
}

export type ResetState = { password?: string; message?: string };

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O, 1/l/I

/** Mot de passe provisoire affiché une seule fois à l'admin ; seul son hachage est enregistré. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature imposée par useActionState (état précédent)
export async function resetPasswordAction(userId: string, _prev: ResetState): Promise<ResetState> {
  const admin = await requireAdmin();
  if (!uuid.test(userId)) return { message: "Utilisateur introuvable." };
  const password = Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const db = getDb();
  const updated = await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, userId)).returning({ id: users.id });
  if (!updated.length) return { message: "Utilisateur introuvable." };
  await log(db, admin.id, "password.reset", userId);
  revalidatePath("/admin");
  return { password };
}

