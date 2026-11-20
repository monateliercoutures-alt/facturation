import { describe, expect, it } from "vitest";
import { toCsv, csvCell } from "@/lib/stats/csv";
import { computeDashboard, type StatDoc, type StatInstallment } from "@/lib/stats/dashboard";
import { addDays, daysBetween, last12Months, resolvePeriod } from "@/lib/stats/period";

const TODAY = "2026-11-18";

describe("périodes", () => {
  it("résout chaque période", () => {
    expect(resolvePeriod("today", TODAY)).toMatchObject({ from: "2026-11-18", to: "2026-11-18" });
    expect(resolvePeriod("7d", TODAY)).toMatchObject({ from: "2026-11-12", to: "2026-11-18" });
    expect(resolvePeriod("month", TODAY)).toMatchObject({ from: "2026-11-01", to: "2026-11-30" });
    expect(resolvePeriod("last-month", TODAY)).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
    expect(resolvePeriod("year", TODAY)).toMatchObject({ from: "2026-01-01", to: "2026-12-31" });
  });
  it("mois dernier en janvier = décembre de l'année précédente", () => {
    expect(resolvePeriod("last-month", "2026-01-15")).toMatchObject({ from: "2025-12-01", to: "2025-12-31" });
  });
  it("février bissextile", () => {
    expect(resolvePeriod("last-month", "2028-03-10")).toMatchObject({ from: "2028-02-01", to: "2028-02-29" });
  });
  it("période personnalisée valide ou repli sur le mois", () => {
    expect(resolvePeriod("custom", TODAY, "2026-09-01", "2026-09-30")).toMatchObject({ key: "custom", from: "2026-09-01", to: "2026-09-30" });
    expect(resolvePeriod("custom", TODAY, "2026-09-30", "2026-09-01").key).toBe("month");
    expect(resolvePeriod("custom", TODAY, "n'importe quoi", "2026-09-01").key).toBe("month");
    expect(resolvePeriod("custom", TODAY, "2026-02-30", "2026-03-01").key).toBe("month");
    expect(resolvePeriod("inconnue", TODAY).key).toBe("month");
  });
  it("12 derniers mois et calculs de dates", () => {
    const m = last12Months(TODAY);
    expect(m).toHaveLength(12);
    expect(m[0]).toBe("2025-12");
    expect(m[11]).toBe("2026-11");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysBetween("2026-11-10", TODAY)).toBe(8);
  });
});

const doc = (p: Partial<StatDoc> & { id: string }): StatDoc => ({
  type: "FAC", number: p.id.toUpperCase(), status: "sent", issueDate: "2026-11-05", total: 0, clientId: "c1", clientName: "Brou", clientPhone: "+2250700000001",
  sourceDocumentId: null, paymentMethods: [], createdAt: new Date("2026-11-05T09:00:00Z"), ...p,
});
const inst = (p: Partial<StatInstallment> & { id: string; documentId: string; amount: number }): StatInstallment => ({ label: "Solde", dueDate: null, paidAt: null, method: null, ...p });

describe("indicateurs", () => {
  const period = resolvePeriod("month", TODAY);
  const docs: StatDoc[] = [
    doc({ id: "f1", total: 60000 }),
    doc({ id: "f2", total: 100000, clientId: "c2", clientName: "Kané", issueDate: "2026-10-20" }),
    doc({ id: "f3", total: 50000, status: "cancelled" }),
    doc({ id: "d1", type: "DEV", total: 999999 }),
    doc({ id: "d2", type: "DEV", total: 500000 }),
    doc({ id: "b1", type: "BL", total: 0 }),
    doc({ id: "f4", total: 500000, sourceDocumentId: "d2", issueDate: "2026-11-06" }),
  ];
  const installments: StatInstallment[] = [
    inst({ id: "i1", documentId: "f1", amount: 20000, label: "Acompte", paidAt: new Date("2026-11-06T10:00:00Z"), method: "wave", dueDate: "2026-11-06" }),
    inst({ id: "i2", documentId: "f1", amount: 40000, dueDate: "2026-11-10" }), // en retard (8 jours)
    inst({ id: "i3", documentId: "f2", amount: 100000, dueDate: "2026-11-20", paidAt: new Date("2026-10-25T10:00:00Z"), method: "cash" }),
    inst({ id: "i4", documentId: "f3", amount: 50000, dueDate: "2026-11-01" }), // facture annulée : ignorée
    inst({ id: "i5", documentId: "f4", amount: 500000, dueDate: "2026-11-22" }), // à venir cette semaine
  ];
  const d = computeDashboard(docs, installments, period, TODAY);

  it("facturé : factures non annulées de la période, jamais les devis ni les BL", () => {
    expect(d.invoiced).toBe(60000 + 500000);
  });
  it("encaissé : tranches payées dans la période", () => {
    expect(d.collected).toBe(20000);
  });
  it("à encaisser : total des factures non annulées moins les tranches payées", () => {
    expect(d.toCollect).toBe(60000 + 100000 + 500000 - 20000 - 100000);
  });
  it("en retard : tranches impayées échues, factures annulées exclues", () => {
    expect(d.overdue).toEqual({ amount: 40000, installments: 1, invoices: 1 });
    expect(d.overdueRows[0]).toMatchObject({ number: "F1", daysLate: 8, label: "Solde" });
  });
  it("à encaisser cette semaine : échéance dans les 7 jours", () => {
    expect(d.dueThisWeek.map((r) => r.number)).toEqual(["F4"]);
  });
  it("devis : en attente et taux de conversion", () => {
    expect(d.quotes.pending).toBe(1); // d1 ; d2 est devenu f4
    expect(d.quotes.created).toBe(2);
    expect(d.quotes.converted).toBe(1);
    expect(d.quotes.conversionRate).toBe(50);
  });
  it("bons de livraison de la période", () => {
    expect(d.deliveries).toBe(1);
  });
  it("graphiques : 12 mois, moyens de paiement, meilleurs clients", () => {
    expect(d.monthly).toHaveLength(12);
    const nov = d.monthly.at(-1)!;
    expect(nov).toMatchObject({ month: "2026-11", invoiced: 560000, collected: 20000 });
    expect(d.monthly.at(-2)).toMatchObject({ month: "2026-10", invoiced: 100000, collected: 100000 });
    expect(d.byMethod).toEqual([{ method: "wave", amount: 20000 }]);
    expect(d.topClients[0]).toMatchObject({ name: "Brou", amount: 560000 });
  });
  it("période vide : tout à zéro, taux de conversion indéfini", () => {
    const e = computeDashboard([], [], period, TODAY);
    expect(e).toMatchObject({ invoiced: 0, collected: 0, toCollect: 0, deliveries: 0 });
    expect(e.quotes.conversionRate).toBeNull();
    expect(e.topClients).toEqual([]);
  });
});

describe("export CSV", () => {
  it("échappe les guillemets, points-virgules et sauts de ligne", () => {
    expect(csvCell('Atelier "Koné"; SARL')).toBe('"Atelier ""Koné""; SARL"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });
  it("neutralise l'injection de formule", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell("+225 07")).toBe("'+225 07");
    expect(csvCell(-5)).toBe("-5");
  });
  it("commence par le BOM et utilise CRLF", () => {
    const csv = toCsv(["A", "B"], [["x", 1]]);
    expect(csv.startsWith("﻿A;B\r\n")).toBe(true);
    expect(csv.endsWith("x;1\r\n")).toBe(true);
  });
});


import { computeAdminStats } from "@/lib/admin/stats";

describe("indicateurs admin", () => {
  const now = new Date("2026-11-18T12:00:00Z");
  it("inscrits, nouveaux de la semaine et actifs", () => {
    const users = [
      { createdAt: new Date("2026-11-17T00:00:00Z") },
      { createdAt: new Date("2026-08-01T00:00:00Z") },
      { createdAt: new Date("2026-01-01T00:00:00Z"), role: "admin" as const },
    ];
    expect(computeAdminStats(users, 2, now)).toEqual({ total: 3, newThisWeek: 1, active30: 2 });
  });
  it("aucun utilisateur", () => {
    expect(computeAdminStats([], 0, now)).toEqual({ total: 0, newThisWeek: 0, active30: 0 });
  });
});

