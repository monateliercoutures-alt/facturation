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
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    expect(companySchema.parse({ name: "Atelier", logo: png }).logo).toBe(png);
  });
});

describe("logo : vérification du contenu réel", () => {
  it("refuse du texte déguisé en PNG", () => {
    const fake = "data:image/png;base64," + Buffer.from("<script>alert(1)</script>").toString("base64");
    expect(companySchema.safeParse({ name: "Atelier", logo: fake }).success).toBe(false);
  });
  it("refuse un JPEG annoncé comme PNG", () => {
    const jpeg = "data:image/png;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]).toString("base64");
    expect(companySchema.safeParse({ name: "Atelier", logo: jpeg }).success).toBe(false);
  });
  it("accepte un vrai JPEG et un vrai WebP", () => {
    const jpeg = "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]).toString("base64");
    const webp = "data:image/webp;base64," + Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 ")]).toString("base64");
    expect(companySchema.safeParse({ name: "Atelier", logo: jpeg }).success).toBe(true);
    expect(companySchema.safeParse({ name: "Atelier", logo: webp }).success).toBe(true);
  });
});
