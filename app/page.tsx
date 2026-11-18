import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) redirect("/app");
  return (
    <div className="mx-auto max-w-[560px] px-4 pt-4 pb-12">
      <header className="mb-10 flex items-center justify-between">
        <Logo />
        <Link href="/connexion" className="rounded-xl px-3 py-2 font-semibold text-g">
          Se connecter
        </Link>
      </header>
      <main>
        <h1 className="mb-3 text-[34px] leading-[1.1] font-extrabold tracking-tight">
          Votre facture en <span className="text-o">30 secondes</span>, depuis votre téléphone.
        </h1>
        <p className="mb-6 text-lg text-mut">
          Factures, devis et bons de livraison en FCFA. Paiement en tranches, Wave, Orange Money, MTN, Moov. Envoi direct sur WhatsApp.
        </p>
        <Link href="/inscription" className="btn mb-3">
          Créer mon compte gratuit
        </Link>
        <Link href="/connexion" className="btn btn-ghost">
          J’ai déjà un compte
        </Link>
        <ul className="mt-8 space-y-3">
          {[
            ["Simple", "3 écrans : le client, les articles, le paiement."],
            ["Pensé pour la Côte d’Ivoire", "Montants en FCFA, TVA 18 %, RCCM et compte contribuable."],
            ["Payé plus vite", "Acompte et tranches, relances WhatsApp en un clic."],
          ].map(([title, text]) => (
            <li key={title} className="card">
              <p className="font-extrabold">{title}</p>
              <p className="text-mut">{text}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
