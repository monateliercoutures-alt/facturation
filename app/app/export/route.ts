import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, documents, installments } from "@/lib/db/schema";
import { DOCUMENT_LABELS, invoiceStatus, methodLabel, statusLabel, todayISO, type DocumentStatus } from "@/lib/documents/calc";
import { toCsv } from "@/lib/stats/csv";
import { dateOf, resolvePeriod } from "@/lib/stats/period";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

/** Export CSV de la période : documents ou paiements. Toujours limité aux données de l'utilisateur connecté. */
export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const today = todayISO();
  const period = resolvePeriod(url.searchParams.get("p") ?? undefined, today, url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
  const kind = url.searchParams.get("kind") === "payments" ? "payments" : "documents";
  const db = getDb();

  const rows = await db
    .select({ doc: documents, clientName: clients.name })
    .from(documents)
    .leftJoin(clients, eq(clients.id, documents.clientId))
    .where(eq(documents.userId, user.id));
  const inst = rows.length
    ? await db.select().from(installments).where(
        inArray(
          installments.documentId,
          rows.map((r) => r.doc.id),
        ),
      )
    : [];

  let csv: string;
  if (kind === "documents") {
    const body = rows
      .filter((r) => r.doc.issueDate >= period.from && r.doc.issueDate <= period.to)
      .sort((a, b) => a.doc.issueDate.localeCompare(b.doc.issueDate) || a.doc.number.localeCompare(b.doc.number))
      .map(({ doc, clientName }) => {
        const mine = inst.filter((i) => i.documentId === doc.id);
        const status: DocumentStatus = doc.type === "FAC" ? invoiceStatus(doc.status, mine, today) : doc.status;
        const paid = mine.filter((i) => i.paidAt).reduce((s, i) => s + i.amount, 0);
        const priced = doc.type !== "BL";
        return [
          doc.number,
          DOCUMENT_LABELS[doc.type].singular,
          formatDate(doc.issueDate),
          doc.dueDate ? formatDate(doc.dueDate) : "",
          clientName ?? "",
          statusLabel(status, doc.type),
          priced ? doc.subtotal : "",
          priced ? doc.discountAmount : "",
          priced ? doc.vatAmount : "",
          priced ? doc.total : "",
          doc.type === "FAC" ? paid : "",
          doc.type === "FAC" && status !== "cancelled" ? doc.total - paid : "",
        ];
      });
    csv = toCsv(["Numéro", "Type", "Date", "Échéance", "Client", "Statut", "Sous-total (FCFA)", "Remise (FCFA)", "TVA (FCFA)", "Total (FCFA)", "Encaissé (FCFA)", "Reste à payer (FCFA)"], body);
  } else {
    const byId = new Map(rows.map((r) => [r.doc.id, r]));
    const body = inst
      .filter((i) => i.paidAt && byId.get(i.documentId)?.doc.type === "FAC" && byId.get(i.documentId)?.doc.status !== "cancelled")
      .filter((i) => dateOf(i.paidAt!) >= period.from && dateOf(i.paidAt!) <= period.to)
      .sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime())
      .map((i) => {
        const r = byId.get(i.documentId)!;
        return [formatDate(i.paidAt!), r.doc.number, r.clientName ?? "", i.label, i.amount, i.method ? methodLabel(i.method) : "Non précisé"];
      });
    csv = toCsv(["Date du paiement", "Facture", "Client", "Tranche", "Montant (FCFA)", "Moyen de paiement"], body);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="factureci-${kind === "payments" ? "paiements" : "documents"}-${period.from}_${period.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
