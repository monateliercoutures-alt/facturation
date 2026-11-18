import { describe, expect, it } from "vitest";
import { companySchema, signInSchema, signUpSchema } from "@/lib/validation";

const valid = { name: "Awa Koné", phone: "07 00 00 00 00", email: "", password: "motdepasse", confirm: "motdepasse" };

describe("signUpSchema", () => {
  it("normalise le téléphone et l'e-mail vide", () => {
    const r = signUpSchema.parse(valid);
    expect(r.phone).toBe("+2250700000000");
    expect(r.email).toBeNull();
  });
  it("refuse un mot de passe court ou différent", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "court", confirm: "court" }).success).toBe(false);
    const r = signUpSchema.safeParse({ ...valid, confirm: "autrechose" });
    expect(r.success).toBe(false);
  });
  it("refuse un e-mail invalide", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "pas-un-mail" }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("refuse un numéro invalide", () => {
    expect(signInSchema.safeParse({ phone: "12", password: "x" }).success).toBe(false);
  });
});

describe("companySchema", () => {
  it("accepte un profil minimal", () => {
    const r = companySchema.parse({ name: "Atelier Koné" });
    expect(r.logo).toBeNull();
    expect(r.rccm).toBeNull();
  });
  it("refuse un logo qui n'est pas une image", () => {
    expect(companySchema.safeParse({ name: "Atelier", logo: "data:text/html;base64,PHNjcmlwdD4=" }).success).toBe(false);
  });
  it("accepte un petit logo PNG", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    expect(companySchema.parse({ name: "Atelier", logo: png }).logo).toBe(png);
  });
});
