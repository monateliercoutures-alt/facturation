import { describe, expect, it } from "vitest";
import { currentYear, formatAmount, formatDate, formatFCFA } from "@/lib/format";
import { formatDocumentNumber } from "@/lib/numbering";

describe("montants et dates", () => {
  it("formate les montants avec espaces, sans décimales", () => {
    expect(formatFCFA(60000)).toBe("60 000 FCFA");
    expect(formatAmount(1250000)).toBe("1 250 000");
    expect(formatAmount(999)).toBe("999");
    expect(formatAmount(13300.4)).toBe("13 300");
  });
  it("formate les dates en jj/mm/aaaa", () => {
    expect(formatDate("2026-11-05")).toBe("05/11/2026");
    expect(formatDate(new Date("2026-11-05T10:00:00Z"))).toBe("05/11/2026");
  });
  it("donne l'année dans le fuseau Africa/Abidjan", () => {
    expect(currentYear(new Date("2026-12-31T23:30:00Z"))).toBe(2026);
  });
});

describe("numérotation", () => {
  it("suit le format TYPE-ANNÉE-000N", () => {
    expect(formatDocumentNumber("FAC", 2026, 1)).toBe("FAC-2026-001");
    expect(formatDocumentNumber("DEV", 2026, 42)).toBe("DEV-2026-042");
    expect(formatDocumentNumber("BL", 2026, 1234)).toBe("BL-2026-1234");
  });
});
