import type { Metadata } from "next";
import { SignInForm } from "./signin-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  // Seuls les chemins internes sont conservés (le serveur revérifie aussi).
  const safe = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : undefined;
  return (
    <>
      <h1 className="mb-1 text-2xl leading-tight font-extrabold tracking-tight">Connexion</h1>
      <p className="mb-5 text-mut">Entrez votre numéro et votre mot de passe.</p>
      <SignInForm callbackUrl={safe} />
    </>
  );
}
