import { methodLabel, PAYMENT_METHODS } from "@/lib/documents/calc";
import type { PaymentNumbers } from "@/lib/db/schema";
import { formatPhone } from "@/lib/phone";

/** Données d'affichage d'un document (aperçu écran et PDF). Aucune dépendance serveur. */
export type SheetData = {
  type: "FAC" | "DEV" | "BL";
  number: string;
  issueDate: string;
  dueDate: string | null;
  company: { name: string; logo: string | null; rccm: string | null; taxNumber: string | null; address: string | null; phone: string | null };
  client: { name: string; phone: string | null; address: string | null };
  items: { description: string; quantity: number; unitPrice: number }[];
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
  /** Affiche « Créé avec FactureCI » (plan Gratuit). */
  mention?: boolean;
};

export function paymentLinesFor(methods: string[], numbers: PaymentNumbers): string[] {
  return methods.map((key) => {
    const mobile = PAYMENT_METHODS.find((m) => m.key === key)?.mobile;
    const number = mobile ? numbers[mobile] : undefined;
    return number ? `${methodLabel(key)} : ${formatPhone(number)}` : methodLabel(key);
  });
}
