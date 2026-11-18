"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { isAdminPhone } from "@/lib/phone";
import { fieldErrors, signInSchema, signUpSchema, type FieldErrors } from "@/lib/validation";

export type FormState = { errors?: FieldErrors; message?: string; ok?: boolean; values?: Record<string, string> };

function values(formData: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

/** Chemin interne uniquement : évite les redirections ouvertes vers un autre site. */
function safeRedirect(target: FormDataEntryValue | null, fallback: string): string {
  const s = typeof target === "string" ? target : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const kept = values(formData, ["name", "phone", "email"]);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: kept };

  const { name, phone, email, password } = parsed.data;
  const inserted = await getDb()
    .insert(users)
    .values({ name, phone, email, passwordHash: await hashPassword(password), role: isAdminPhone(phone) ? "admin" : "user" })
    .onConflictDoNothing({ target: users.phone })
    .returning({ id: users.id });
  if (inserted.length === 0) {
    return { errors: { phone: "Ce numéro a déjà un compte. Connectez-vous ou utilisez un autre numéro." }, values: kept };
  }

  await signIn("credentials", { phone, password, redirectTo: "/app/entreprise?bienvenue=1" });
  return { ok: true };
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const kept = values(formData, ["phone"]);
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: kept };
  try {
    await signIn("credentials", {
      phone: parsed.data.phone,
      password: parsed.data.password,
      redirectTo: safeRedirect(formData.get("callbackUrl"), "/app"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Numéro ou mot de passe incorrect. Vérifiez-les puis réessayez.", values: kept };
    }
    throw error; // la redirection de succès passe par une exception
  }
  return { ok: true };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/connexion" });
}
