"use server";

import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { adminActions, installments, paymentRequests, users } from "@/lib/db/schema";
import { todayISO } from "@/lib/documents/calc";
import { createDocument, refreshInvoiceStatus } from "@/lib/documents/service";
import { hashPassword } from "@/lib/password";
import { nextExpiry, PLAN_LABELS, type PlanKey } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";

const PLANS = ["free", "pro", "business"] as const;
const uuid = /^[0-9a-f-]{36}$/i;

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function log(tx: Db | Tx, adminId: string, action: string, targetUserId: string | null, details: Record<string, string | number | null> = {}) {
  await tx.insert(adminActions).values({ adminId, action, targetUserId, details });
}

/** Valide une demande de paiement : active le plan (+30 jours) et crée la facture d'abonnement du compte admin. */
export async function validatePaymentAction(requestId: string) {
  const admin = await requireAdmin();
  if (!uuid.test(requestId)) return;
  await getDb().transaction(async (tx) => {
    // Le passage pending → validated est atomique : un double clic ne peut pas activer deux fois.
    const [req] = await tx
      .update(paymentRequests)
      .set({ status: "validated", validatedAt: new Date() })
      .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.status, "pending")))
      .returning();
    if (!req) return;
    const [user] = await tx.select().from(users).where(eq(users.id, req.userId)).limit(1);
    if (!user) return;

    const expires = nextExpiry(user, req.plan);
    await tx.update(users).set({ plan: req.plan, planExpiresAt: expires }).where(eq(users.id, user.id));

    // Facture d'abonnement dans le compte de l'administrateur, avec le moteur de documents.
    const today = todayISO();
    const docId = await createDocument(
      admin.id,
      {
        type: "FAC",
        sourceDocumentId: null,
        client: { id: null, name: `${user.name} (${user.phone})`, phone: user.phone, email: user.email, address: null },
        items: [{ description: `Abonnement FactureCI ${PLAN_LABELS[req.plan]} - 30 jours`, quantity: 1, unitPrice: req.amount }],
        discountPercent: 0,
        vatPercent: 0,
        issueDate: today,
        dueDate: today,
        note: `Référence de paiement : ${req.reference}`,
        paymentMethods: ["wave"],
        paymentNumbers: {},
        installments: { count: 1, amounts: [req.amount], dueDates: [today] },
        deliveryAddress: null,
        deliveredBy: null,
      },
      tx,
    );
    // Le paiement est déjà reçu : la tranche unique est marquée payée.
    await tx.update(installments).set({ paidAt: new Date(), method: "wave" }).where(eq(installments.documentId, docId));
    await refreshInvoiceStatus(tx, admin.id, docId);
    await log(tx, admin.id, "payment.validated", user.id, { plan: req.plan, amount: req.amount, reference: req.reference, expiresAt: expires.toISOString() });
  });
  revalidatePath("/admin");
}

export async function rejectPaymentAction(requestId: string) {
  const admin = await requireAdmin();
  if (!uuid.test(requestId)) return;
  await getDb().transaction(async (tx) => {
    const [req] = await tx
      .update(paymentRequests)
      .set({ status: "rejected", validatedAt: new Date() })
      .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.status, "pending")))
      .returning();
    if (req) await log(tx, admin.id, "payment.rejected", req.userId, { plan: req.plan, amount: req.amount, reference: req.reference });
  });
  revalidatePath("/admin");
}

export async function changePlanAction(userId: string, formData: FormData) {
  const admin = await requireAdmin();
  const plan = String(formData.get("plan")) as PlanKey;
  if (!uuid.test(userId) || !PLANS.includes(plan)) return;
  await getDb().transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.plan === plan) return;
    const expires = plan === "free" ? null : nextExpiry(user, plan);
    await tx.update(users).set({ plan, planExpiresAt: expires }).where(eq(users.id, userId));
    await log(tx, admin.id, "plan.changed", userId, { from: user.plan, to: plan, expiresAt: expires?.toISOString() ?? null });
  });
  revalidatePath("/admin");
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

