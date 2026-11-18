import "server-only";
import type { DocumentView } from "@/lib/documents/service";
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
      logo: company?.logo ?? null,
      rccm: company?.rccm ?? null,
      taxNumber: company?.taxNumber ?? null,
      address: company?.address ?? null,
      phone: company?.phone ?? null,
    },
    client: { name: client?.name ?? "Client", phone: client?.phone ?? null, address: client?.address ?? null },
    items: view.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
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
  };
}

