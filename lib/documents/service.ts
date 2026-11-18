import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { clients, companies, documentItems, documents, installments, type PaymentNumbers } from "@/lib/db/schema";
import { computeTotals, installmentLabels, invoiceStatus, type DocumentStatus } from "@/lib/documents/calc";
import type { DocumentData } from "@/lib/documents/schema";
import { nextDocumentNumber } from "@/lib/numbering";
import { currentYear } from "@/lib/format";

export type DocumentView = {
  doc: typeof documents.$inferSelect;
  /** Statut recalculé à la date du jour (ex. « en retard »). */
  status: DocumentStatus;
  items: (typeof documentItems.$inferSelect)[];
  installments: (typeof installments.$inferSelect)[];
  client: typeof clients.$inferSelect | null;
  company: typeof companies.$inferSelect | null;
};

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export class DocumentError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

function newShareToken() {
  return randomBytes(24).toString("base64url");
}

function displayStatus(doc: { type: string; status: DocumentStatus }, inst: (typeof installments.$inferSelect)[]): DocumentStatus {
  return doc.type === "FAC" ? invoiceStatus(doc.status, inst) : doc.status;
}

async function loadParts(db: Db | Tx, doc: typeof documents.$inferSelect): Promise<DocumentView> {
  const [items, inst, client, company] = await Promise.all([
    db.select().from(documentItems).where(eq(documentItems.documentId, doc.id)).orderBy(asc(documentItems.position)),
    db.select().from(installments).where(eq(installments.documentId, doc.id)).orderBy(asc(installments.position)),
    doc.clientId ? db.select().from(clients).where(and(eq(clients.id, doc.clientId), eq(clients.userId, doc.userId))).limit(1) : Promise.resolve([]),
    db.select().from(companies).where(eq(companies.userId, doc.userId)).limit(1),
  ]);
  return { doc, status: displayStatus(doc, inst), items, installments: inst, client: client[0] ?? null, company: company[0] ?? null };
}

/** Document d'un utilisateur. Un identifiant d'un autre utilisateur donne null (jamais de fuite). */
export async function getDocumentForUser(userId: string, id: string): Promise<DocumentView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = getDb();
  const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, userId))).limit(1);
  return doc ? loadParts(db, doc) : null;
}

/** Lecture publique par jeton de partage (le jeton est le secret). */
export async function getDocumentByToken(token: string): Promise<DocumentView | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const db = getDb();
  const [doc] = await db.select().from(documents).where(eq(documents.shareToken, token)).limit(1);
  return doc ? loadParts(db, doc) : null;
}

export type ListRow = {
  id: string;
  type: "FAC" | "DEV" | "BL";
  number: string;
  status: DocumentStatus;
  issueDate: string;
  total: number;
  clientName: string | null;
  paid: number;
};

export type ListFilters = { q?: string; type?: string; status?: string };

export async function listDocuments(userId: string, filters: ListFilters = {}, limit = 300): Promise<ListRow[]> {
  const db = getDb();
  const docs = await db
    .select({ doc: documents, clientName: clients.name })
    .from(documents)
    .leftJoin(clients, eq(clients.id, documents.clientId))
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt))
    .limit(limit);
  const ids = docs.map((d) => d.doc.id);
  const inst = ids.length ? await db.select().from(installments).where(inArray(installments.documentId, ids)) : [];
  const byDoc = new Map<string, (typeof installments.$inferSelect)[]>();
  for (const i of inst) byDoc.set(i.documentId, [...(byDoc.get(i.documentId) ?? []), i]);

  const q = filters.q?.trim().toLowerCase();
  return docs
    .map(({ doc, clientName }) => {
      const list = byDoc.get(doc.id) ?? [];
      return {
        id: doc.id,
        type: doc.type,
        number: doc.number,
        status: displayStatus(doc, list),
        issueDate: doc.issueDate,
        total: doc.total,
        clientName,
        paid: list.filter((i) => i.paidAt).reduce((s, i) => s + i.amount, 0),
      } satisfies ListRow;
    })
    .filter((r) => (!filters.type || r.type === filters.type) && (!filters.status || r.status === filters.status))
    .filter((r) => !q || r.number.toLowerCase().includes(q) || (r.clientName ?? "").toLowerCase().includes(q));
}

export async function listClientNames(userId: string) {
  return getDb()
    .select({ id: clients.id, name: clients.name, phone: clients.phone, email: clients.email, address: clients.address })
    .from(clients)
    .where(eq(clients.userId, userId))
    .orderBy(asc(clients.name))
    .limit(500);
}

/** Crée un document complet (client, numéro, lignes, tranches) dans une seule transaction. */
export async function createDocument(userId: string, data: DocumentData, outer?: Db | Tx): Promise<string> {
  // `outer` : transaction appelante (point de sauvegarde imbriqué), pour tout valider ou tout annuler ensemble.
  const db = outer ?? getDb();
  const isBL = data.type === "BL";

  // Un document d'origine doit appartenir au même utilisateur.
  if (data.sourceDocumentId) {
    const [src] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, data.sourceDocumentId), eq(documents.userId, userId))).limit(1);
    if (!src) throw new DocumentError("Le document d'origine est introuvable.");
  }

  const items = data.items.map((i) => ({ ...i, unitPrice: isBL ? 0 : i.unitPrice }));
  const totals = isBL ? { subtotal: 0, discountAmount: 0, vatAmount: 0, total: 0 } : computeTotals(items, data.discountPercent, data.vatPercent);

  // Tranches : le total est recalculé ici, jamais pris du navigateur.
  let plan: { label: string; amount: number; dueDate: string | null }[] = [];
  if (!isBL) {
    const count = data.installments.count;
    const amounts = count === 1 ? [totals.total] : data.installments.amounts;
    if (amounts.length !== count) throw new DocumentError("Le nombre de tranches ne correspond pas aux montants.", "installments");
    const sum = amounts.reduce((a, b) => a + b, 0);
    if (sum !== totals.total) throw new DocumentError(`La somme des tranches (${sum}) doit être égale au total (${totals.total}).`, "installments");
    const labels = installmentLabels(count);
    plan = amounts.map((amount, i) => ({ label: labels[i], amount, dueDate: /^\d{4}-\d{2}-\d{2}$/.test(data.installments.dueDates[i] ?? "") ? (data.installments.dueDates[i] as string) : null }));
  }

  return db.transaction(async (tx) => {
    // Client : existant (vérifié par user_id) ou créé automatiquement.
    let clientId: string | null = null;
    if (data.client.id) {
      const [c] = await tx.select({ id: clients.id }).from(clients).where(and(eq(clients.id, data.client.id), eq(clients.userId, userId))).limit(1);
      clientId = c?.id ?? null;
    }
    if (!clientId) {
      const [existing] = await tx.select({ id: clients.id }).from(clients).where(and(eq(clients.userId, userId), eq(clients.name, data.client.name))).limit(1);
      clientId = existing?.id ?? null;
    }
    const clientFields = { name: data.client.name, phone: data.client.phone, email: data.client.email, address: data.client.address };
    if (clientId) {
      await tx.update(clients).set(clientFields).where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
    } else {
      [{ id: clientId }] = await tx.insert(clients).values({ userId, ...clientFields }).returning({ id: clients.id });
    }

    // Numéros Mobile Money saisis : mémorisés dans le profil (s'il existe).
    const entered = Object.fromEntries(Object.entries(data.paymentNumbers).filter(([, v]) => v)) as PaymentNumbers;
    if (!isBL && Object.keys(entered).length > 0) {
      const [co] = await tx.select().from(companies).where(eq(companies.userId, userId)).limit(1);
      if (co) await tx.update(companies).set({ paymentNumbers: { ...co.paymentNumbers, ...entered } }).where(and(eq(companies.id, co.id), eq(companies.userId, userId)));
    }

    const number = await nextDocumentNumber(tx, userId, data.type, currentYear());
    const status: DocumentStatus = isBL ? "draft" : "sent";
    const [doc] = await tx
      .insert(documents)
      .values({
        userId,
        clientId,
        type: data.type,
        number,
        status,
        issueDate: data.issueDate,
        dueDate: isBL ? null : data.dueDate,
        discountPercent: isBL ? 0 : data.discountPercent,
        vatPercent: isBL ? 0 : data.vatPercent,
        ...totals,
        note: data.note,
        paymentMethods: isBL ? [] : data.paymentMethods,
        deliveryAddress: isBL ? (data.deliveryAddress ?? data.client.address) : null,
        deliveredBy: isBL ? data.deliveredBy : null,
        sourceDocumentId: data.sourceDocumentId ?? null,
        shareToken: newShareToken(),
      })
      .returning({ id: documents.id });

    await tx.insert(documentItems).values(items.map((i, position) => ({ documentId: doc.id, position, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })));
    if (plan.length) await tx.insert(installments).values(plan.map((p, position) => ({ documentId: doc.id, position, ...p })));
    return doc.id;
  });
}

/** Recalcule et enregistre le statut d'une facture après un changement de tranche. */
export async function refreshInvoiceStatus(db: Db | Tx, userId: string, documentId: string) {
  const [doc] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId))).limit(1);
  if (!doc || doc.type !== "FAC") return;
  const inst = await db.select().from(installments).where(eq(installments.documentId, doc.id));
  const next = invoiceStatus(doc.status, inst);
  if (next !== doc.status) await db.update(documents).set({ status: next }).where(and(eq(documents.id, doc.id), eq(documents.userId, userId)));
}
