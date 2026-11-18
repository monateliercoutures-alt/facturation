import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Hors connexion", robots: { index: false } };

/* eslint-disable @next/next/no-html-link-for-pages --
   Navigations complètes voulues : hors connexion elles passent par le service worker (un <Link> ferait un appel réseau). */
// Page publique et statique : précachée par le service worker.
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-[440px] px-4 pt-10 text-center">
      <div className="mb-6"><Logo href="/app" /></div>
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight">Vous êtes hors connexion</h1>
      <p className="mb-5 text-mut">Pas de réseau pour le moment. Vos données sont en sécurité : revenez dès que la connexion est rétablie.</p>
      <div className="card text-left">
        <p className="mb-1 font-bold">Vous pouvez quand même :</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-mut">
          <li>Créer une facture, un devis ou un bon de livraison : il sera enregistré sur votre téléphone, puis envoyé automatiquement au retour du réseau.</li>
        </ul>
        <a href="/app/documents/nouveau?type=FAC" className="btn btn-orange mt-3">Créer un document</a>
      </div>
      <a href="/app" className="btn btn-ghost mt-3">Réessayer</a>
    </div>
  );
}
