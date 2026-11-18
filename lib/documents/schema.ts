import { z } from "zod";
import { MAX_INSTALLMENTS, PAYMENT_METHOD_KEYS } from "@/lib/documents/calc";
import { optionalPhone } from "@/lib/validation";

const text = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`);
const optText = (max: number) =>
  text(max)
    .nullish()
    .transform((v) => (v ? v : null));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
const optDate = z
  .string()
  .nullish()
  .transform((v) => (v ? v : null))
  .pipe(isoDate.nullable());

export const itemSchema = z.object({
  description: text(300).min(1, "Décrivez cette ligne."),
  quantity: z.number({ error: "Quantité invalide." }).positive("La quantité doit être supérieure à 0.").max(1_000_000, "Quantité trop grande."),
  unitPrice: z.number({ error: "Prix invalide." }).int("Le prix doit être un nombre entier de FCFA.").min(0, "Le prix ne peut pas être négatif.").max(1_000_000_000, "Prix trop grand."),
});

export const documentInputSchema = z.object({
  type: z.enum(["FAC", "DEV", "BL"]),
  /** Document d'origine (devis → facture, facture → BL, duplication). Vérifié côté serveur. */
  sourceDocumentId: z.uuid().nullish(),
  client: z.object({
    id: z.uuid().nullish(),
    name: text(160).min(1, "Entrez le nom du client."),
    phone: optionalPhone,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .nullish()
      .transform((v) => v || null)
      .pipe(z.email("Adresse e-mail invalide.").nullable()),
    address: optText(300),
  }),
  items: z.array(itemSchema).min(1, "Ajoutez au moins une ligne.").max(50, "50 lignes maximum."),
  discountPercent: z.number().min(0, "La remise ne peut pas être négative.").max(100, "La remise ne peut pas dépasser 100 %.").default(0),
  vatPercent: z.union([z.literal(0), z.literal(18)]).default(0),
  issueDate: isoDate,
  dueDate: optDate,
  note: optText(1000),
  paymentMethods: z.array(z.enum(PAYMENT_METHOD_KEYS)).max(PAYMENT_METHOD_KEYS.length).default([]),
  /** Numéros Mobile Money saisis sur le formulaire : mémorisés dans le profil de l'entreprise. */
  paymentNumbers: z
    .object({ wave: optionalPhone, orangeMoney: optionalPhone, mtnMoney: optionalPhone, moovMoney: optionalPhone })
    .partial()
    .default({}),
  installments: z
    .object({
      count: z.number().int().min(1).max(MAX_INSTALLMENTS),
      amounts: z.array(z.number().int("Les montants doivent être entiers.").min(0, "Un montant ne peut pas être négatif.")).max(MAX_INSTALLMENTS),
      dueDates: z.array(z.string().nullish()).max(MAX_INSTALLMENTS),
    })
    .default({ count: 1, amounts: [], dueDates: [] }),
  deliveryAddress: optText(300),
  deliveredBy: optText(160),
});

export type DocumentInput = z.input<typeof documentInputSchema>;
export type DocumentData = z.output<typeof documentInputSchema>;

export const paymentUpdateSchema = z.object({
  installmentId: z.uuid(),
  paidAt: isoDate,
  method: z.enum(PAYMENT_METHOD_KEYS).nullish(),
});
