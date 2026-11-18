import "server-only";
import type { DocumentView } from "@/lib/documents/service";
import { PLAN_FEATURES } from "@/lib/plans";
import { paymentLinesFor, type SheetData } from "@/lib/documents/sheet";

export function toSheet(view: DocumentView): SheetData {
  const { doc, company, client } = view;
  return {
    type: doc.type,
    number: doc.number,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    company: {
      name: company?.name ?? "Votre entreprise",
      // Le logo est une fonction du plan Pro : masqué (mais conservé) si le plan est retombé sur Gratuit.
      logo: PLAN_FEATURES[view.ownerPlan].logo ? (company?.logo ?? null) : null,
      rccm: company?.rccm ?? null,
      taxNumber: company?.taxNumber ?? null,
      address: company?.address ?? null,
      phone: company?.phone ?? null,
      email: company?.email ?? null,
      website: company?.website ?? null,
      tagline: company?.tagline ?? null,
      bankDetails: company?.bankDetails ?? null,
    },
    client: { name: client?.name ?? "Client", phone: client?.phone ?? null, email: client?.email ?? null, address: client?.address ?? null },
    items: view.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, unit: i.unit, quantityDelivered: i.quantityDelivered, observation: i.observation })),
    subtotal: doc.subtotal,
    discountPercent: doc.discountPercent,
    discountAmount: doc.discountAmount,
    vatPercent: doc.vatPercent,
    vatAmount: doc.vatAmount,
    total: doc.total,
    installments: view.installments.map((i) => ({ label: i.label, amount: i.amount, dueDate: i.dueDate, paidAt: i.paidAt ? i.paidAt.toISOString().slice(0, 10) : null })),
    paymentLines: paymentLinesFor(doc.paymentMethods, company?.paymentNumbers ?? {}),
    note: doc.note,
    deliveryAddress: doc.deliveryAddress,
    deliveredBy: doc.deliveredBy,
    subject: doc.subject,
    clientReference: doc.clientReference,
    mention: PLAN_FEATURES[view.ownerPlan].pdfMention,
  };
}

