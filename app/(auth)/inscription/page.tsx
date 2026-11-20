import type { Metadata } from "next";
import { signupOpen } from "@/lib/access";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl leading-tight font-extrabold tracking-tight">Créez votre compte</h1>
      <p className="mb-5 text-mut">{signupOpen() ? "Votre première facture en moins d’une minute." : "Inscription réservée au propriétaire de l’outil."}</p>
      <SignUpForm />
    </>
  );
}
