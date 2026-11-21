"use server";

import { CredentialsSignin, AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { fieldErrors, signInSchema, type FieldErrors } from "@/lib/validation";

export type FormState = { errors?: FieldErrors; message?: string; ok?: boolean; values?: Record<string, string> };

function values(formData: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

/** Chemin interne uniquement : évite les redirections ouvertes vers un autre site. */
function safeRedirect(target: FormDataEntryValue | null, fallback: string): string {
  const s = typeof target === "string" ? target : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
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
    if (error instanceof CredentialsSignin && error.code === "limite") {
      return { message: "Trop de tentatives. Patientez 15 minutes avant de réessayer.", values: kept };
    }
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
