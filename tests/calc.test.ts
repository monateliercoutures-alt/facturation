import { describe, expect, it } from "vitest";
import { computeTotals, defaultDeposit, installmentLabels, invoiceStatus, splitInstallments } from "@/lib/documents/calc";
import { amountSentence, numberToFrench } from "@/lib/documents/words";

describe("totaux", () => {
  it("calcule sous-total, remise, TVA et total", () => {
    expect(computeTotals([{ quantity: 1, unitPrice: 60000 }], 0, 0)).toEqual({ subtotal: 60000, discountAmount: 0, vatAmount: 0, total: 60000 });
    // 60 000 − 10 % = 54 000 ; TVA 18 % = 9 720 ; total 63 720
    expect(computeTotals([{ quantity: 1, unitPrice: 60000 }], 10, 18)).toEqual({ subtotal: 60000, discountAmount: 6000, vatAmount: 9720, total: 63720 });
  });
  it("additionne plusieurs lignes et arrondit les quantités décimales", () => {
    expect(computeTotals([{ quantity: 2, unitPrice: 15000 }, { quantity: 1.5, unitPrice: 1001 }], 0, 0).subtotal).toBe(31502);
  });
  it("arrondit la remise et la TVA au FCFA", () => {
    const t = computeTotals([{ quantity: 1, unitPrice: 12345 }], 7, 18);
    expect(t.discountAmount).toBe(864);
    expect(t.vatAmount).toBe(2067);
    expect(t.total).toBe(12345 - 864 + 2067);
  });
});

describe("tranches", () => {
  it("exemple du cahier des charges : 60 000, acompte 20 000, 4 tranches", () => {
    expect(splitInstallments(60000, 4, 20000)).toEqual([20000, 13300, 13300, 13400]);
  });
  it("1 tranche = paiement comptant, sans acompte", () => {
    expect(splitInstallments(60000, 1, 5000)).toEqual([60000]);
    expect(installmentLabels(1)).toEqual(["Paiement comptant"]);
  });
  it("2 à 6 tranches : la somme égale toujours le total", () => {
    for (const total of [60000, 63720, 99999, 1, 250000]) {
      for (let n = 2; n <= 6; n++) {
        const parts = splitInstallments(total, n, defaultDeposit(total, n));
        expect(parts).toHaveLength(n);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(parts.every((p) => p >= 0)).toBe(true);
      }
    }
  });
  it("borne l'acompte entre 0 et le total", () => {
    expect(splitInstallments(10000, 3, 99999)).toEqual([10000, 0, 0]);
    expect(splitInstallments(10000, 3, -5)[0]).toBe(0);
  });
  it("nomme les tranches", () => {
    expect(installmentLabels(2)).toEqual(["Acompte", "Solde"]);
    expect(installmentLabels(4)).toEqual(["Acompte", "Tranche 2", "Tranche 3", "Solde"]);
  });
});

describe("statut de facture", () => {
  const today = "2026-11-18";
  const paid = new Date("2026-11-01");
  it("sent → partial → paid", () => {
    expect(invoiceStatus("sent", [{ amount: 1, paidAt: null, dueDate: null }, { amount: 1, paidAt: null, dueDate: null }], today)).toBe("sent");
    expect(invoiceStatus("sent", [{ amount: 1, paidAt: paid, dueDate: null }, { amount: 1, paidAt: null, dueDate: "2026-12-01" }], today)).toBe("partial");
    expect(invoiceStatus("partial", [{ amount: 1, paidAt: paid, dueDate: null }, { amount: 1, paidAt: paid, dueDate: null }], today)).toBe("paid");
  });
  it("overdue quand une échéance impayée est dépassée", () => {
    expect(invoiceStatus("sent", [{ amount: 1, paidAt: null, dueDate: "2026-11-10" }], today)).toBe("overdue");
    expect(invoiceStatus("sent", [{ amount: 1, paidAt: paid, dueDate: "2026-11-10" }, { amount: 1, paidAt: null, dueDate: "2026-11-30" }], today)).toBe("partial");
  });
  it("une facture annulée le reste", () => {
    expect(invoiceStatus("cancelled", [{ amount: 1, paidAt: paid, dueDate: null }], today)).toBe("cancelled");
  });
});

describe("montant en lettres", () => {
  const cases: [number, string][] = [
    [0, "zéro"],
    [21, "vingt et un"],
    [71, "soixante et onze"],
    [80, "quatre-vingts"],
    [81, "quatre-vingt-un"],
    [100, "cent"],
    [200, "deux cents"],
    [201, "deux cent un"],
    [1000, "mille"],
    [60000, "soixante mille"],
    [1250000, "un million deux cent cinquante mille"],
    [13300, "treize mille trois cents"],
    [80000, "quatre-vingt mille"],
    [200000, "deux cent mille"],
    [2000000, "deux millions"],
    [999999, "neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf"],
    [1000000000, "un milliard"],
    [63720, "soixante-trois mille sept cent vingt"],
  ];
  it.each(cases)("%i → %s", (n, words) => expect(numberToFrench(n)).toBe(words));
  it("écrit la phrase complète", () => {
    expect(amountSentence(60000)).toBe("Arrêté à la somme de : soixante mille francs CFA.");
  });
});
