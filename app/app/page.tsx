import type { Metadata } from "next";
import Link from "next/link";
import { getCompanyForUser } from "@/lib/company";
import { invoiceStatus, todayISO } from "@/lib/documents/calc";
import { PLAN_LABELS } from "@/lib/plans";
import { getDashboard } from "@/lib/stats/queries";
import { resolvePeriod } from "@/lib/stats/period";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayISO();
  const period = resolvePeriod(sp.p, today, sp.from, sp.to);
  const [company, { dashboard, docs, installments }] = await Promise.all([getCompanyForUser(user.id), getDashboard(user.id, period, today)]);

  const instByDoc = new Map<string, typeof installments>();
  for (const i of installments) instByDoc.set(i.documentId, [...(instByDoc.get(i.documentId) ?? []), i]);
  const recent = [...docs]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      type: d.type,
      number: d.number,
      clientName: d.clientName,
      total: d.total,
      status: d.type === "FAC" ? invoiceStatus(d.status as never, instByDoc.get(d.id) ?? [], today) : (d.status as never),
    }));

  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Bonjour {user.name.split(" ")[0]}</h1>
      <p className="mb-4 text-mut">
        Plan {PLAN_LABELS[user.plan]}
        {user.planExpiresAt ? ` · jusqu’au ${formatDate(user.planExpiresAt)}` : ""}
      </p>
      {!company ? (
        <section className="card mb-4 border-o/50">
          <h2 className="mb-1 text-lg font-extrabold">Complétez le profil de votre entreprise</h2>
          <p className="mb-3 text-mut">Votre nom, votre logo, votre RCCM et vos numéros Mobile Money apparaîtront sur chaque document.</p>
          <Link href="/app/entreprise" className="btn btn-orange">Renseigner mon entreprise</Link>
        </section>
      ) : null}
      <DashboardView d={dashboard} period={period} recent={recent} company={company?.name ?? null} />
    </>
  );
}
