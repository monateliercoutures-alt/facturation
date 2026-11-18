import type { DocumentType } from "@/lib/db/schema";

export const VAT_RATES = [0, 18] as const;
export const MAX_INSTALLMENTS = 6;

export type ItemInput = { quantity: number; unitPrice: number };

export type Totals = { subtotal: number; discountAmount: number; vatAmount: number; total: number };

/** sous-total = Σ(quantité × prix) ; remise et TVA arrondies au FCFA. */
export function computeTotals(items: ItemInput[], discountPercent: number, vatPercent: number): Totals {
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const vatAmount = Math.round(((subtotal - discountAmount) * vatPercent) / 100);
  return { subtotal, discountAmount, vatAmount, total: subtotal - discountAmount + vatAmount };
}

export function installmentLabels(count: number): string[] {
  if (count <= 1) return ["Paiement comptant"];
  return Array.from({ length: count }, (_, i) => (i === 0 ? "Acompte" : i === count - 1 ? "Solde" : `Tranche ${i + 1}`));
}

/**
 * Répartition en tranches : acompte saisi, reste à parts égales arrondies à 100 FCFA
 * vers le bas, la dernière tranche absorbe la différence.
 * 60 000, acompte 20 000, 4 tranches → 20 000 / 13 300 / 13 300 / 13 400.
 */
export function splitInstallments(total: number, count: number, deposit: number): number[] {
  if (count <= 1) return [total];
  const dep = Math.max(0, Math.min(Math.round(deposit) || 0, total));
  const others = count - 1;
  const rest = total - dep;
  const base = Math.floor(rest / others / 100) * 100;
  return [dep, ...Array<number>(others - 1).fill(base), rest - base * (others - 1)];
}

/** Acompte proposé par défaut : une part égale, arrondie à 100 FCFA vers le bas. */
export function defaultDeposit(total: number, count: number): number {
  return count <= 1 ? total : Math.floor(total / count / 100) * 100;
}

export type InstallmentLike = { amount: number; paidAt: Date | string | null; dueDate: string | null };
export type DocumentStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled" | "delivered";

/** Date du jour (aaaa-mm-jj) dans le fuseau Africa/Abidjan. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Statut d'une facture déduit de ses tranches (hors annulation, qui reste manuelle). */
export function invoiceStatus(current: DocumentStatus, installments: InstallmentLike[], today = todayISO()): DocumentStatus {
  if (current === "cancelled") return "cancelled";
  if (installments.length === 0) return current === "draft" ? "draft" : "sent";
  const unpaid = installments.filter((i) => !i.paidAt);
  if (unpaid.length === 0) return "paid";
  if (unpaid.some((i) => i.dueDate && i.dueDate < today)) return "overdue";
  if (unpaid.length < installments.length) return "partial";
  return current === "draft" ? "draft" : "sent";
}

export function hasPrices(type: DocumentType): boolean {
  return type !== "BL";
}

export const PAYMENT_METHODS = [
  { key: "wave", label: "Wave", mobile: "wave" },
  { key: "orange", label: "Orange Money", mobile: "orangeMoney" },
  { key: "mtn", label: "MTN Money", mobile: "mtnMoney" },
  { key: "moov", label: "Moov Money", mobile: "moovMoney" },
  { key: "cash", label: "Espèces", mobile: null },
  { key: "transfer", label: "Virement", mobile: null },
  { key: "cheque", label: "Chèque", mobile: null },
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]["key"];
export const PAYMENT_METHOD_KEYS = PAYMENT_METHODS.map((m) => m.key) as [PaymentMethodKey, ...PaymentMethodKey[]];

export function methodLabel(key: string): string {
  return PAYMENT_METHODS.find((m) => m.key === key)?.label ?? key;
}

export const DOCUMENT_LABELS: Record<DocumentType, { singular: string; plural: string; upper: string }> = {
  FAC: { singular: "Facture", plural: "Factures", upper: "FACTURE" },
  DEV: { singular: "Devis", plural: "Devis", upper: "DEVIS" },
  BL: { singular: "Bon de livraison", plural: "Bons de livraison", upper: "BON DE LIVRAISON" },
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  partial: "Partiel",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
  delivered: "Livré",
};

export const ITEM_TEMPLATES = ["Création de site web", "Prestation de service", "Vente de marchandises"] as const;
