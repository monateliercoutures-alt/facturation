"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { companies, type PaymentNumbers } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { companySchema, fieldErrors } from "@/lib/validation";
import type { FormState } from "./auth";

export async function saveCompanyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // React 19 vide le formulaire après l'action : on renvoie la saisie pour la conserver.
    const values = Object.fromEntries([...formData].filter(([k, v]) => k !== "logo" && typeof v === "string")) as Record<string, string>;
    return { errors: fieldErrors(parsed.error), values, message: "Corrigez les champs en rouge puis enregistrez." };
  }

  const d = parsed.data;
  const paymentNumbers: PaymentNumbers = {};
  if (d.wave) paymentNumbers.wave = d.wave;
  if (d.orangeMoney) paymentNumbers.orangeMoney = d.orangeMoney;
  if (d.mtnMoney) paymentNumbers.mtnMoney = d.mtnMoney;
  if (d.moovMoney) paymentNumbers.moovMoney = d.moovMoney;

  const fields = {
    name: d.name,
    rccm: d.rccm,
    taxNumber: d.taxNumber,
    address: d.address,
    phone: d.phone,
    paymentNumbers,
    defaultNote: d.defaultNote,
    email: d.email,
    website: d.website,
    tagline: d.tagline,
    bankDetails: d.bankDetails,
    // Logo : nouveau fichier, suppression demandée, ou inchangé (undefined = ne pas toucher).
    ...(d.logo ? { logo: d.logo } : d.removeLogo ? { logo: null } : {}),
  };

  const db = getDb();
  await db
    .insert(companies)
    .values({ userId: user.id, ...fields })
    .onConflictDoUpdate({ target: companies.userId, set: fields });

  revalidatePath("/app", "layout");
  return { ok: true, message: "Profil de l'entreprise enregistré." };
}

