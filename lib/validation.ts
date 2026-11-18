import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password";

const trimmed = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : null));

export const phoneSchema = z
  .string({ error: "Indiquez votre numéro de téléphone." })
  .trim()
  .min(1, "Indiquez votre numéro de téléphone.")
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Numéro invalide. Exemple : 07 00 00 00 00." });
      return z.NEVER;
    }
    return phone;
  });

export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Numéro invalide. Exemple : 07 00 00 00 00." });
      return z.NEVER;
    }
    return phone;
  });

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .max(PASSWORD_MAX_LENGTH, `Le mot de passe doit faire au plus ${PASSWORD_MAX_LENGTH} caractères.`);

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => v || null)
  .pipe(z.email("Adresse e-mail invalide.").nullable());

export const signUpSchema = z
  .object({
    name: trimmed(120).min(2, "Indiquez votre nom (2 caractères minimum)."),
    phone: phoneSchema,
    email: optionalEmail,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Les deux mots de passe ne sont pas identiques." });

export const signInSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Indiquez votre mot de passe.").max(PASSWORD_MAX_LENGTH),
});

/** Logo : data URL d'une image déjà redimensionnée dans le navigateur (240 px max). */
export const LOGO_MAX_BYTES = 200 * 1024;

/** Le contenu doit réellement être une image du type annoncé (signature des premiers octets). */
export function matchesImageSignature(mime: "png" | "jpeg" | "webp", base64: string): boolean {
  const head = Buffer.from(base64.slice(0, 24), "base64");
  if (mime === "png") return head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "jpeg") return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  return head.length >= 12 && head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP";
}
const logoSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
    if (!m) {
      ctx.addIssue({ code: "custom", message: "Le logo doit être une image PNG, JPEG ou WebP." });
      return z.NEVER;
    }
    if (!matchesImageSignature(m[1] as "png" | "jpeg" | "webp", m[2])) {
      ctx.addIssue({ code: "custom", message: "Ce fichier n'est pas une vraie image. Choisissez un logo PNG, JPEG ou WebP." });
      return z.NEVER;
    }
    if (Math.floor((m[2].length * 3) / 4) > LOGO_MAX_BYTES) {
      ctx.addIssue({ code: "custom", message: "Logo trop lourd après redimensionnement. Choisissez une image plus simple." });
      return z.NEVER;
    }
    return value;
  });

export const companySchema = z.object({
  name: trimmed(160).min(2, "Indiquez le nom de l'entreprise."),
  logo: logoSchema,
  removeLogo: z.literal("1").optional(),
  rccm: optionalText(80),
  taxNumber: optionalText(80),
  address: optionalText(300),
  phone: optionalPhone,
  wave: optionalPhone,
  orangeMoney: optionalPhone,
  mtnMoney: optionalPhone,
  moovMoney: optionalPhone,
  defaultNote: optionalText(1000),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => v || null)
    .pipe(z.email("Adresse e-mail invalide.").nullable()),
  website: optionalText(200),
  tagline: optionalText(120),
  bankDetails: optionalText(400),
});

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
