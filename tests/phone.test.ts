import { describe, expect, it } from "vitest";
import { adminPhones, formatPhone, isAdminPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("accepte les formats ivoiriens courants", () => {
    expect(normalizePhone("07 00 00 00 00")).toBe("+2250700000000");
    expect(normalizePhone("0700000000")).toBe("+2250700000000");
    expect(normalizePhone("+225 07 00 00 00 00")).toBe("+2250700000000");
    expect(normalizePhone("00225 0700000000")).toBe("+2250700000000");
    expect(normalizePhone("2250700000000")).toBe("+2250700000000");
  });
  it("rejette les numéros invalides", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("0700")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("+22507000")).toBeNull();
  });
  it("accepte un numéro international", () => {
    expect(normalizePhone("+221771234567")).toBe("+221771234567");
  });
});

describe("formatPhone / admins", () => {
  it("formate pour l'affichage", () => {
    expect(formatPhone("+2250700000000")).toBe("+225 07 00 00 00 00");
  });
  it("reconnaît les numéros admin quel que soit le format saisi", () => {
    const raw = "0700000000, +225 01 02 03 04 05";
    expect(adminPhones(raw).size).toBe(2);
    expect(isAdminPhone("+2250102030405", raw)).toBe(true);
    expect(isAdminPhone("+2250799999999", raw)).toBe(false);
  });
});
