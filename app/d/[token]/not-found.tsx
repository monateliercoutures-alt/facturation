import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[440px] px-4 pt-16 text-center">
      <h1 className="mb-2 text-2xl font-extrabold">Document introuvable</h1>
      <p className="mb-5 text-mut">Ce lien n’est plus valide. Demandez à votre fournisseur de vous renvoyer le document.</p>
      <Link href="/" className="btn btn-ghost">Retour à l’accueil</Link>
    </div>
  );
}
