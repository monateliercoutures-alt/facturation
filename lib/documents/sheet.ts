import { methodLabel, PAYMENT_METHODS } from "@/lib/documents/calc";
import type { DocumentType } from "@/lib/db/schema";
import type { PaymentNumbers } from "@/lib/db/schema";
import { formatPhone } from "@/lib/phone";

/** Données d'affichage d'un document (aperçu écran et PDF). Aucune dépendance serveur. */
export type SheetData = {
  type: DocumentType;
  number: string;
  issueDate: string;
  dueDate: string | null;
  company: { name: string; logo: string | null; rccm: string | null; taxNumber: string | null; address: string | null; phone: string | null; email: string | null; website: string | null; tagline: string | null; bankDetails: string | null };
  client: { name: string; phone: string | null; email: string | null; address: string | null };
  items: { description: string; quantity: number; unitPrice: number; unit: string | null; quantityDelivered: number | null; observation: string | null }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  vatPercent: number;
  vatAmount: number;
  total: number;
  installments: { label: string; amount: number; dueDate: string | null; paidAt: string | null }[];
  paymentLines: string[];
  note: string | null;
  deliveryAddress: string | null;
  deliveredBy: string | null;
  subject: string | null;
  clientReference: string | null;
};

export function paymentLinesFor(methods: string[], numbers: PaymentNumbers): string[] {
  return methods.map((key) => {
    const mobile = PAYMENT_METHODS.find((m) => m.key === key)?.mobile;
    const number = mobile ? numbers[mobile] : undefined;
    return number ? `${methodLabel(key)} : ${formatPhone(number)}` : methodLabel(key);
  });
}

import { TYPE_TRAITS } from "@/lib/documents/calc";
import { formatPhone as fmtPhone } from "@/lib/phone";

/** Valeurs dérivées communes à l'aperçu écran et au PDF (un seul endroit pour les libellés). */
export function deriveSheet(data: SheetData) {
  const traits = TYPE_TRAITS[data.type];
  const isBL = data.type === "BL";
  const paid = data.type === "FAC" ? data.installments.filter((i) => i.paidAt).reduce((s, i) => s + i.amount, 0) : 0;
  const hasVat = data.vatPercent > 0;
  /** Total hors taxes après remise. */
  const netHt = data.subtotal - data.discountAmount;
  const totalLabel = data.type === "FAC" ? "Net à payer" : hasVat ? "Total TTC" : "Total";
  const showUnit = data.items.some((i) => i.unit);
  const showObservations = isBL && data.items.some((i) => i.observation);
  const bankVisible = Boolean(data.company.bankDetails) && data.paymentLines.some((l) => l.startsWith("Virement"));
  const identity = [data.company.rccm ? `RCCM : ${data.company.rccm}` : null, data.company.taxNumber ? `CC : ${data.company.taxNumber}` : null].filter(Boolean) as string[];
  const contact = [data.company.phone ? fmtPhone(data.company.phone) : null, data.company.email, data.company.website].filter(Boolean) as string[];
  const showShipTo = !isBL && Boolean(data.deliveryAddress);
  return { traits, isBL, paid, remaining: Math.max(0, data.total - paid), hasVat, netHt, totalLabel, showUnit, showObservations, bankVisible, identity, contact, showShipTo };
}
