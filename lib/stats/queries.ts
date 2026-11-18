import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, documents, installments } from "@/lib/db/schema";
import { computeDashboard, type StatDoc, type StatInstallment } from "@/lib/stats/dashboard";
import type { Period } from "@/lib/stats/period";

/** Lignes brutes d'un utilisateur. Toutes les requêtes filtrent par user_id. */
export async function loadUserRows(userId: string): Promise<{ docs: StatDoc[]; installments: StatInstallment[] }> {
  const db = getDb();
  const rows = await db
    .select({ doc: documents, clientName: clients.name, clientPhone: clients.phone })
    .from(documents)
    .leftJoin(clients, eq(clients.id, documents.clientId))
    .where(eq(documents.userId, userId));
  const ids = rows.map((r) => r.doc.id);
  const inst = ids.length ? await db.select().from(installments).where(inArray(installments.documentId, ids)) : [];
  return {
    docs: rows.map(({ doc, clientName, clientPhone }) => ({
      id: doc.id,
      type: doc.type,
      number: doc.number,
      status: doc.status,
      issueDate: doc.issueDate,
      total: doc.total,
      clientId: doc.clientId,
      clientName,
      clientPhone,
      sourceDocumentId: doc.sourceDocumentId,
      paymentMethods: doc.paymentMethods,
      createdAt: doc.createdAt,
    })),
    installments: inst.map((i) => ({ id: i.id, documentId: i.documentId, label: i.label, amount: i.amount, dueDate: i.dueDate, paidAt: i.paidAt, method: i.method })),
  };
}

export async function getDashboard(userId: string, period: Period, today: string) {
  const { docs, installments: inst } = await loadUserRows(userId);
  return { dashboard: computeDashboard(docs, inst, period, today), docs, installments: inst };
}

/** Un seul accès à la base pour vérifier qu'un document appartient bien à l'utilisateur. */
export async function ownsDocument(userId: string, documentId: string): Promise<boolean> {
  const [row] = await getDb().select({ id: documents.id }).from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId))).limit(1);
  return Boolean(row);
}
