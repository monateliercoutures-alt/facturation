import Link from "next/link";
import { getCompanyForUser } from "@/lib/company";
import { StatusPill } from "@/components/status-pill";
import { listDocuments } from "@/lib/documents/service";
import { formatDate, formatFCFA } from "@/lib/format";
import { requireUser } from "@/lib/session";

const PLAN_LABELS = { free: "Gratuit", pro: "Pro", business: "Business" } as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const [company, recent] = await Promise.all([getCompanyForUser(user.id), listDocuments(user.id, {}, 5).then((r) => r.slice(0, 5))]);
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

      <section className="mb-4 grid gap-2 sm:grid-cols-3" aria-label="Créer un document">
        <Link href="/app/documents/nouveau?type=FAC" className="btn">+ Facture</Link>
        <Link href="/app/documents/nouveau?type=DEV" className="btn btn-ghost">+ Devis</Link>
        <Link href="/app/documents/nouveau?type=BL" className="btn btn-ghost">+ Bon de livraison</Link>
      </section>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Derniers documents</h2>
          <Link href="/app/documents" className="text-sm font-semibold text-g underline">Tout voir</Link>
        </div>
        {recent.length === 0 ? (
          <>
            <p className="mb-3 text-mut">Vous n’avez pas encore de document.</p>
            <Link href="/app/documents/nouveau" className="btn btn-orange">Créer ma première facture</Link>
          </>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={`/app/documents/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 no-underline">
                  <span className="min-w-0">
                    <span className="block font-bold">{r.number}</span>
                    <span className="block truncate text-sm text-mut">{r.clientName ?? "Client"}{r.type !== "BL" ? ` · ${formatFCFA(r.total)}` : ""}</span>
                  </span>
                  <StatusPill status={r.status} type={r.type} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
