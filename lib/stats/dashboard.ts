/**
 * Indicateurs du tableau de bord utilisateur. Fonctions pures : elles reçoivent des lignes déjà
 * filtrées par user_id et ne touchent pas à la base (voir lib/stats/queries.ts).
 *
 * Définitions (CLAUDE.md) :
 * - Facturé   = total des factures (FAC) non annulées émises sur la période.
 * - Encaissé  = somme des tranches dont paid_at tombe dans la période.
 * - À encaisser = total des factures non annulées moins les tranches payées.
 * - En retard = tranches non payées dont l'échéance est dépassée.
 * Les devis et les bons de livraison ne comptent jamais dans le chiffre d'affaires.
 */
import { addDays, dateOf, daysBetween, last12Months, type Period } from "@/lib/stats/period";

export type StatDoc = {
  id: string;
  type: "FAC" | "DEV" | "BL";
  number: string;
  status: string;
  issueDate: string;
  total: number;
  clientId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  sourceDocumentId: string | null;
  paymentMethods: string[];
  createdAt: Date;
};

export type StatInstallment = {
  id: string;
  documentId: string;
  label: string;
  amount: number;
  dueDate: string | null;
  paidAt: Date | null;
  method: string | null;
};

export type DueRow = {
  installmentId: string;
  documentId: string;
  number: string;
  clientName: string;
  clientPhone: string | null;
  label: string;
  amount: number;
  dueDate: string;
  /** Jours de retard (> 0) ou jours restants avant l'échéance (négatif ou 0). */
  daysLate: number;
  paymentMethods: string[];
};

export type Dashboard = {
  invoiced: number;
  collected: number;
  toCollect: number;
  overdue: { amount: number; installments: number; invoices: number };
  quotes: { pending: number; created: number; converted: number; conversionRate: number | null };
  deliveries: number;
  monthly: { month: string; invoiced: number; collected: number }[];
  byMethod: { method: string; amount: number }[];
  topClients: { clientId: string | null; name: string; amount: number }[];
  dueThisWeek: DueRow[];
  overdueRows: DueRow[];
};

const inRange = (date: string, p: Pick<Period, "from" | "to">) => date >= p.from && date <= p.to;

export function computeDashboard(docs: StatDoc[], installments: StatInstallment[], period: Period, today: string): Dashboard {
  const live = docs.filter((d) => d.status !== "cancelled");
  const invoices = live.filter((d) => d.type === "FAC");
  const invoiceById = new Map(invoices.map((d) => [d.id, d]));
  // Seules les tranches des factures non annulées comptent.
  const inst = installments.filter((i) => invoiceById.has(i.documentId));

  const invoiced = invoices.filter((d) => inRange(d.issueDate, period)).reduce((s, d) => s + d.total, 0);

  const paidInPeriod = inst.filter((i) => i.paidAt && inRange(dateOf(i.paidAt), period));
  const collected = paidInPeriod.reduce((s, i) => s + i.amount, 0);

  const totalInvoiced = invoices.reduce((s, d) => s + d.total, 0);
  const totalPaid = inst.filter((i) => i.paidAt).reduce((s, i) => s + i.amount, 0);
  const toCollect = Math.max(0, totalInvoiced - totalPaid);

  const unpaid = inst.filter((i) => !i.paidAt && i.dueDate);
  const toRow = (i: StatInstallment): DueRow => {
    const doc = invoiceById.get(i.documentId)!;
    return {
      installmentId: i.id,
      documentId: doc.id,
      number: doc.number,
      clientName: doc.clientName ?? "Client",
      clientPhone: doc.clientPhone,
      label: i.label,
      amount: i.amount,
      dueDate: i.dueDate!,
      daysLate: daysBetween(i.dueDate!, today),
      paymentMethods: doc.paymentMethods,
    };
  };
  const overdueRows = unpaid.filter((i) => i.dueDate! < today).map(toRow).sort((a, b) => b.daysLate - a.daysLate);
  const weekEnd = addDays(today, 7);
  const dueThisWeek = unpaid.filter((i) => i.dueDate! >= today && i.dueDate! <= weekEnd).map(toRow).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Devis : « en attente » = ni annulé ni déjà transformé en facture.
  const convertedQuoteIds = new Set(docs.filter((d) => d.type === "FAC" && d.sourceDocumentId).map((d) => d.sourceDocumentId));
  const quotes = live.filter((d) => d.type === "DEV");
  const quotesInPeriod = quotes.filter((d) => inRange(d.issueDate, period));
  const converted = quotesInPeriod.filter((d) => convertedQuoteIds.has(d.id)).length;

  const months = last12Months(today);
  const monthly = months.map((month) => ({
    month,
    invoiced: invoices.filter((d) => d.issueDate.startsWith(month)).reduce((s, d) => s + d.total, 0),
    collected: inst.filter((i) => i.paidAt && dateOf(i.paidAt).startsWith(month)).reduce((s, i) => s + i.amount, 0),
  }));

  const methodTotals = new Map<string, number>();
  for (const i of paidInPeriod) methodTotals.set(i.method ?? "unknown", (methodTotals.get(i.method ?? "unknown") ?? 0) + i.amount);

  const clientTotals = new Map<string, { clientId: string | null; name: string; amount: number }>();
  for (const d of invoices.filter((d) => inRange(d.issueDate, period))) {
    const key = d.clientId ?? `anon-${d.clientName ?? ""}`;
    const row = clientTotals.get(key) ?? { clientId: d.clientId, name: d.clientName ?? "Client", amount: 0 };
    row.amount += d.total;
    clientTotals.set(key, row);
  }

  return {
    invoiced,
    collected,
    toCollect,
    overdue: { amount: overdueRows.reduce((s, r) => s + r.amount, 0), installments: overdueRows.length, invoices: new Set(overdueRows.map((r) => r.documentId)).size },
    quotes: {
      pending: quotes.filter((d) => !convertedQuoteIds.has(d.id)).length,
      created: quotesInPeriod.length,
      converted,
      conversionRate: quotesInPeriod.length ? Math.round((converted / quotesInPeriod.length) * 100) : null,
    },
    deliveries: live.filter((d) => d.type === "BL" && inRange(d.issueDate, period)).length,
    monthly,
    byMethod: [...methodTotals].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount),
    topClients: [...clientTotals.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    dueThisWeek,
    overdueRows,
  };
}
