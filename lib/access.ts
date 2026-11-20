import { isAdminPhone } from "@/lib/phone";

/**
 * Outil privé : l'inscription n'est ouverte qu'aux numéros listés dans ADMIN_PHONES (le propriétaire crée ainsi
 * son compte), sauf si ALLOW_SIGNUP=yes. Évite que des inconnus créent des comptes sur votre base.
 */
export function signupOpen(): boolean {
  return process.env.ALLOW_SIGNUP === "yes";
}

export function canSignUp(phone: string): boolean {
  return signupOpen() || isAdminPhone(phone);
}
