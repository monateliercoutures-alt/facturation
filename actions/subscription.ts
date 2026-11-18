"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { paymentRequests } from "@/lib/db/schema";
import { PLAN_PRICES } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { z } from "zod";

export type PaymentFormState = { message?: string; ok?: boolean };

const schema = z.object({
  plan: z.enum(["pro", "business"], { error: "Choisissez un plan." }),
  reference: z
    .string()
    .trim()
    .min(3, "Saisissez la référence de la transaction Wave ou le numéro qui a payé (3 caractères minimum).")
    .max(60, "Référence trop longue (60 caractères maximum)."),
});

/** Crée une demande de paiement « en attente » : l'admin vérifie le paiement Wave puis la valide. */
export async function requestPaymentAction(_prev: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0].message };

  const db = getDb();
  // Une seule demande en attente à la fois : évite les doublons et les validations multiples.
  const [pending] = await db.select({ id: paymentRequests.id }).from(paymentRequests).where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.status, "pending"))).limit(1);
  if (pending) return { message: "Vous avez déjà un paiement en cours de vérification. Patientez, nous le validons au plus vite." };

  await db.insert(paymentRequests).values({ userId: user.id, plan: parsed.data.plan, amount: PLAN_PRICES[parsed.data.plan], reference: parsed.data.reference });
  revalidatePath("/app/abonnement");
  return { ok: true, message: "Merci ! Votre paiement est en cours de vérification." };
}
