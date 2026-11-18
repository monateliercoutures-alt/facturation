import type { Metadata } from "next";
import Link from "next/link";
import { adminPhones, formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  const [admin] = adminPhones();
  const message = "Bonjour, j'ai oublié mon mot de passe FactureCI. Mon numéro de compte est : ";
  const waLink = admin ? `https://wa.me/${admin.slice(1)}?text=${encodeURIComponent(message)}` : null;
  return (
    <>
      <h1 className="mb-1 text-2xl leading-tight font-extrabold tracking-tight">Mot de passe oublié</h1>
      <p className="mb-5 text-mut">Pour l’instant, la réinitialisation se fait avec l’aide de notre équipe.</p>
      <div className="card">
        <ol className="mb-4 list-decimal space-y-2 pl-5">
          <li>Écrivez-nous sur WhatsApp depuis le numéro de votre compte.</li>
          <li>Nous vérifions que le compte est bien le vôtre.</li>
          <li>Nous vous envoyons un mot de passe provisoire. Changez-le dès votre connexion.</li>
        </ol>
        {waLink ? (
          <>
            <a href={waLink} className="btn" target="_blank" rel="noopener noreferrer">
              Écrire sur WhatsApp
            </a>
            <p className="hint text-center">{formatPhone(admin!)}</p>
          </>
        ) : (
          <p className="hint">Contactez l’administrateur de FactureCI.</p>
        )}
        <Link href="/connexion" className="btn btn-ghost mt-3">
          Retour à la connexion
        </Link>
      </div>
    </>
  );
}
