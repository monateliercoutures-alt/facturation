import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl leading-tight font-extrabold tracking-tight">Mot de passe oublié</h1>
      <p className="mb-5 text-mut">Cet outil est privé : il n’y a pas de réinitialisation automatique.</p>
      <div className="card">
        <p className="mb-4">
          Demandez au propriétaire de réinitialiser votre mot de passe depuis l’espace <strong>Admin</strong> (bouton « Réinitialiser le mot de passe »). Il vous donnera un mot de passe provisoire.
        </p>
        <Link href="/connexion" className="btn btn-ghost">
          Retour à la connexion
        </Link>
      </div>
    </>
  );
}
