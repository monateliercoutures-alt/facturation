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
  return TYPE_TRAITS[type].priced;
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

export const DOCUMENT_TYPES = ["FAC", "PRO", "DEV", "BL", "BC"] as const;

/**
 * Ce que chaque type de document comporte. Un seul endroit : formulaire, calculs, aperçu et PDF s'y réfèrent.
 * - priced : prix, remise et TVA. payment : tranches et moyens de paiement.
 */
export type TypeTraits = {
  singular: string;
  plural: string;
  upper: string;
  priced: boolean;
  payment: boolean;
  feminine: boolean;
  /** Intitulé du bloc « client ». */
  party: string;
  /** Intitulé de la date limite du document. */
  dueLabel: string;
  signLeft: string;
  signRight: string;
  /** Demande la mention « Bon pour accord » (devis, pro forma). */
  agreement: boolean;
};

export const TYPE_TRAITS: Record<DocumentType, TypeTraits> = {
  FAC: { singular: "Facture", plural: "Factures", upper: "FACTURE", priced: true, payment: true, feminine: true, party: "Facturé à", dueLabel: "Date d'échéance", signLeft: "Le prestataire", signRight: "Cachet et signature du client", agreement: false },
  PRO: { singular: "Facture pro forma", plural: "Factures pro forma", upper: "FACTURE PRO FORMA", priced: true, payment: true, feminine: true, party: "Client", dueLabel: "Valable jusqu'au", signLeft: "Le prestataire", signRight: "Bon pour accord, cachet et signature du client", agreement: true },
  DEV: { singular: "Devis", plural: "Devis", upper: "DEVIS", priced: true, payment: true, feminine: false, party: "Client", dueLabel: "Valable jusqu'au", signLeft: "Le prestataire", signRight: "Signature du client précédée de la mention « Bon pour accord »", agreement: true },
  BL: { singular: "Bon de livraison", plural: "Bons de livraison", upper: "BON DE LIVRAISON", priced: false, payment: false, feminine: false, party: "Livré à", dueLabel: "Date de livraison", signLeft: "Le livreur", signRight: "Reçu par (nom, date, signature)", agreement: false },
  BC: { singular: "Bon de commande", plural: "Bons de commande", upper: "BON DE COMMANDE", priced: true, payment: false, feminine: false, party: "Fournisseur", dueLabel: "Livraison souhaitée avant le", signLeft: "Autorisé par (nom et titre)", signRight: "Signature et date", agreement: false },
};

export const DOCUMENT_LABELS = TYPE_TRAITS;

export const UNIT_SUGGESTIONS = ["u", "h", "jour", "m²", "m", "kg", "L", "forfait", "carton", "sac"] as const;

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

/** « Envoyée » est féminin pour une facture ; un devis ou un bon de livraison prend le masculin. */
export function statusLabel(status: DocumentStatus, type?: DocumentType): string {
  return status === "sent" && type && !TYPE_TRAITS[type].feminine ? "Envoyé" : STATUS_LABELS[status];
}
