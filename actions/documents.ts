"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { documents, installments } from "@/lib/db/schema";
import { createDocument, DocumentError, PlanLimitError, refreshInvoiceStatus } from "@/lib/documents/service";
import { documentInputSchema, paymentUpdateSchema } from "@/lib/documents/schema";
import { requireUser } from "@/lib/session";

export type DocumentFormState = { ok: false; message: string; errors?: Record<string, string> };

/** Enregistre un document puis ouvre sa page. Renvoie les erreurs de saisie sans rien enregistrer. */
export type SyncResult = { ok: true; id: string } | { ok: false; message: string };

/** Envoi d'un brouillon créé hors connexion : mêmes contrôles que la création, sans redirection. */
export async function syncDraftAction(input: unknown): Promise<SyncResult> {
  const user = await requireUser();
  const parsed = documentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Brouillon invalide." };
  try {
    const id = await createDocument(user.id, parsed.data);
    revalidatePath("/app", "layout");
    return { ok: true, id };
  } catch (e) {
    if (e instanceof PlanLimitError) return { ok: false, message: "Limite de votre plan atteinte : passez au plan Pro pour envoyer ce brouillon." };
    if (e instanceof DocumentError) return { ok: false, message: e.message };
    throw e;
  }
}

export async function createDocumentAction(input: unknown): Promise<DocumentFormState> {
  const user = await requireUser();
  const parsed = documentInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
    return { ok: false, message: Object.values(errors)[0] ?? "Vérifiez les champs.", errors };
  }
  let id: string;
  try {
    id = await createDocument(user.id, parsed.data);
  } catch (e) {
    // Limite du plan : page claire « Passez au plan Pro », jamais une erreur technique.
    if (e instanceof PlanLimitError) redirect(`/app/abonnement?limite=${e.kind}`);
    if (e instanceof DocumentError) return { ok: false, message: e.message, errors: e.field ? { [e.field]: e.message } : undefined };
    throw e;
  }
  revalidatePath("/app", "layout");
  redirect(`/app/documents/${id}?cree=1`);
}

/** Marque une tranche payée (date + moyen) ou annule ce marquage. */
export async function setInstallmentPaidAction(documentId: string, formData: FormData) {
  const user = await requireUser();
  const db = getDb();
  const action = String(formData.get("action") ?? "pay");
  const parsed = paymentUpdateSchema.safeParse({
    installmentId: formData.get("installmentId"),
    paidAt: formData.get("paidAt") || new Date().toISOString().slice(0, 10),
    method: formData.get("method") || null,
  });
  if (!parsed.success) return;

  // La tranche doit appartenir à un document de l'utilisateur ET à ce document.
  const [doc] = await db.select({ id: documents.id, type: documents.type }).from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, user.id))).limit(1);
  if (!doc || doc.type !== "FAC") return;
  const paidAt = action === "unpay" ? null : new Date(`${parsed.data.paidAt}T12:00:00Z`);
  await db
    .update(installments)
    .set({ paidAt, method: action === "unpay" ? null : (parsed.data.method ?? null) })
    .where(and(eq(installments.id, parsed.data.installmentId), eq(installments.documentId, doc.id)));
  await refreshInvoiceStatus(db, user.id, doc.id);
  revalidatePath(`/app/documents/${doc.id}`);
}

export async function cancelDocumentAction(documentId: string) {
  const user = await requireUser();
  await getDb().update(documents).set({ status: "cancelled" }).where(and(eq(documents.id, documentId), eq(documents.userId, user.id)));
  revalidatePath(`/app/documents/${documentId}`);
  revalidatePath("/app/documents");
}

export async function markDeliveredAction(documentId: string) {
  const user = await requireUser();
  await getDb()
    .update(documents)
    .set({ status: "delivered" })
    .where(and(eq(documents.id, documentId), eq(documents.userId, user.id), eq(documents.type, "BL")));
  revalidatePath(`/app/documents/${documentId}`);
  revalidatePath("/app/documents");
}
