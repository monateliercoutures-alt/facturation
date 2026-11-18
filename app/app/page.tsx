import Link from "next/link";
import { getCompanyForUser } from "@/lib/company";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

const PLAN_LABELS = { free: "Gratuit", pro: "Pro", business: "Business" } as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const company = await getCompanyForUser(user.id);
  const firstName = user.name.split(" ")[0];
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Bonjour {firstName}</h1>
      <p className="mb-5 text-mut">
        Plan {PLAN_LABELS[user.plan]}
        {user.planExpiresAt ? ` · jusqu’au ${formatDate(user.planExpiresAt)}` : ""}
      </p>

      {!company ? (
        <section className="card mb-4 border-o/50">
          <h2 className="mb-1 text-lg font-extrabold">Complétez le profil de votre entreprise</h2>
          <p className="mb-3 text-mut">Votre nom, votre logo, votre RCCM et vos numéros Mobile Money apparaîtront sur chaque document.</p>
          <Link href="/app/entreprise" className="btn btn-orange">
            Renseigner mon entreprise
          </Link>
        </section>
      ) : (
        <section className="card mb-4 flex items-center gap-3">
          {company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL déjà redimensionnée
            <img src={company.logo} alt={`Logo de ${company.name}`} className="h-12 w-auto max-w-[120px] object-contain" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold">{company.name}</p>
            <Link href="/app/entreprise" className="text-sm font-semibold text-g underline">
              Modifier le profil
            </Link>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="mb-1 text-lg font-extrabold">Factures, devis et bons de livraison</h2>
        <p className="text-mut">La création de documents arrive à la prochaine étape.</p>
      </section>
    </>
  );
}
