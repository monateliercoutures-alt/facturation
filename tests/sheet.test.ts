import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPES, statusLabel, TYPE_TRAITS } from "@/lib/documents/calc";
import { deriveSheet, type SheetData } from "@/lib/documents/sheet";
import { documentInputSchema } from "@/lib/documents/schema";

const base: SheetData = {
  type: "FAC", number: "FAC-2026-001", issueDate: "2026-11-18", dueDate: null,
  company: { name: "Atelier", logo: null, rccm: "CI-ABJ-1", taxNumber: "123", address: null, phone: "+2250700000000", email: "a@b.ci", website: null, tagline: null, brandColor: null, bankDetails: "BICICI 123" },
  client: { name: "Brou", phone: null, email: null, address: null },
  items: [{ description: "Table", quantity: 1, unitPrice: 100000, unit: "u", quantityDelivered: null, observation: null }],
  subtotal: 100000, discountPercent: 10, discountAmount: 10000, vatPercent: 18, vatAmount: 16200, total: 106200,
  installments: [{ label: "Acompte", amount: 50000, dueDate: null, paidAt: "2026-11-18" }, { label: "Solde", amount: 56200, dueDate: null, paidAt: null }],
  paymentLines: ["Wave : +225 07 00 00 00 00", "Virement"], note: null, deliveryAddress: null, deliveredBy: null, subject: null, clientReference: null,
};

describe("types de documents", () => {
  it("cinq types, chacun avec ses règles", () => {
    expect(DOCUMENT_TYPES).toEqual(["FAC", "PRO", "DEV", "BL", "BC"]);
    expect(TYPE_TRAITS.BL).toMatchObject({ priced: false, payment: false });
    expect(TYPE_TRAITS.BC).toMatchObject({ priced: true, payment: false });
    expect(TYPE_TRAITS.PRO).toMatchObject({ priced: true, payment: true, feminine: true });
    expect(TYPE_TRAITS.DEV.agreement).toBe(true);
  });
  it("accord du statut « envoyé » selon le genre", () => {
    expect(statusLabel("sent", "FAC")).toBe("Envoyée");
    expect(statusLabel("sent", "PRO")).toBe("Envoyée");
    expect(statusLabel("sent", "DEV")).toBe("Envoyé");
    expect(statusLabel("sent", "BC")).toBe("Envoyé");
  });
  it("le schéma accepte les cinq types et refuse les autres", () => {
    const ok = { client: { name: "Brou" }, items: [{ description: "x", quantity: 1, unitPrice: 0 }], issueDate: "2026-11-18" };
    for (const type of DOCUMENT_TYPES) expect(documentInputSchema.safeParse({ ...ok, type }).success).toBe(true);
    expect(documentInputSchema.safeParse({ ...ok, type: "XXX" }).success).toBe(false);
  });
});

describe("aperçu : valeurs dérivées", () => {
  it("TVA : Total HT, Net à payer, déjà réglé, reste à payer", () => {
    const d = deriveSheet(base);
    expect(d.netHt).toBe(90000);
    expect(d.totalLabel).toBe("Net à payer");
    expect(d.paid).toBe(50000);
    expect(d.remaining).toBe(56200);
    expect(d.showUnit).toBe(true);
    expect(d.bankVisible).toBe(true);
    expect(d.identity).toEqual(["RCCM : CI-ABJ-1", "CC : 123"]);
  });
  it("devis avec TVA : « Total TTC » ; sans TVA : « Total »", () => {
    expect(deriveSheet({ ...base, type: "DEV" }).totalLabel).toBe("Total TTC");
    expect(deriveSheet({ ...base, type: "DEV", vatPercent: 0 }).totalLabel).toBe("Total");
  });
  it("les coordonnées bancaires n'apparaissent que si le virement est accepté", () => {
    expect(deriveSheet({ ...base, paymentLines: ["Wave"] }).bankVisible).toBe(false);
  });
  it("bon de livraison : observations seulement s'il y en a, jamais de reste à payer", () => {
    const bl = { ...base, type: "BL" as const, installments: [] };
    expect(deriveSheet(bl).showObservations).toBe(false);
    expect(deriveSheet({ ...bl, items: [{ ...base.items[0], observation: "1 carton abîmé" }] }).showObservations).toBe(true);
    expect(deriveSheet(bl).paid).toBe(0);
  });
  it("adresse de livraison distincte pour une facture", () => {
    expect(deriveSheet({ ...base, deliveryAddress: "Yopougon" }).showShipTo).toBe(true);
    expect(deriveSheet({ ...base, type: "BL", deliveryAddress: "Yopougon" }).showShipTo).toBe(false);
  });
});
