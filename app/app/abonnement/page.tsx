import type { Metadata } from "next";
import { eq, desc } from "drizzle-orm";
import { PaymentForm } from "./payment-form";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { getDb } from "@/lib/db";
import { paymentRequests } from "@/lib/db/schema";
import { formatDate, formatFCFA } from "@/lib/format";
import { daysUntilExpiry, effectivePlan, PLAN_FEATURES, PLAN_LABELS, PLAN_PRICES, REMINDER_DAYS } from "@/lib/plans";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Mon abonnement" };

const LIMIT_MESSAGES: Record<string, string> = {
  documents: "Vous avez atteint la limite de 5 documents du mois du plan Gratuit.",
  clients: "Vous avez atteint la limite de votre carnet de clients.",
  export: "L’export CSV est réservé au plan Business.",
};

const REQUEST_STATUS = { pending: "En cours de vérification", validated: "Validé", rejected: "Rejeté" } as const;

const PLAN_LINES: Record<"pro" | "business", string[]> = {
  pro: ["Documents illimités", "Votre logo sur les documents", "PDF sans mention « Créé avec FactureCI »", "Envoi par e-mail", "Tableau de bord complet", "Relances WhatsApp"],
  business: ["Tout le plan Pro", "Export CSV pour votre comptable", "Carnet de clients illimité", "Jusqu’à 3 utilisateurs (bientôt disponible)"],
};

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ limite?: string }> }) {
  const user = await requireUser();
  const { limite } = await searchParams;
  const plan = effectivePlan(user);
  const days = daysUntilExpiry(user);
  const requests = await getDb().select().from(paymentRequests).where(eq(paymentRequests.userId, user.id)).orderBy(desc(paymentRequests.createdAt)).limit(10);
  const pending = requests.find((r) => r.status === "pending");
  const wave = { pro: process.env.WAVE_LINK_PRO, business: process.env.WAVE_LINK_BUSINESS };
  const expired = user.plan !== "free" && plan === "free" && user.role !== "admin";

  return (
    <>
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Mon abonnement</h1>

      {limite && LIMIT_MESSAGES[limite] ? (
        <div className="mb-4"><UpgradeNotice title={limite === "export" ? "Passez au plan Business" : "Passez au plan Pro"}>{LIMIT_MESSAGES[limite]} Choisissez un plan ci-dessous : l’activation est rapide.</UpgradeNotice></div>
      ) : null}

      <section className="card mb-4" aria-label="Plan actuel">
        <p className="text-sm font-semibold text-mut">Votre plan</p>
        <p className="text-2xl font-extrabold">{PLAN_LABELS[plan]}</p>
        {plan !== "free" && user.planExpiresAt ? <p className="text-mut">Valable jusqu’au {formatDate(user.planExpiresAt)}</p> : null}
        {days !== null && days <= REMINDER_DAYS ? <p role="status" className="mt-2 rounded-xl bg-o/15 px-3 py-2 text-sm font-semibold">Votre plan se termine dans {days} jour{days > 1 ? "s" : ""}. Renouvelez-le ci-dessous pour ne pas perdre vos avantages.</p> : null}
        {expired ? <p role="status" className="mt-2 rounded-xl bg-o/15 px-3 py-2 text-sm font-semibold">Votre plan {PLAN_LABELS[user.plan]} a expiré le {user.planExpiresAt ? formatDate(user.planExpiresAt) : ""}. Vous êtes revenu au plan Gratuit ; toutes vos données sont conservées.</p> : null}
        {plan === "free" ? <p className="mt-1 text-sm text-mut">{PLAN_FEATURES.free.documentsPerMonth} documents par mois, PDF avec la mention « Créé avec FactureCI ».</p> : null}
      </section>

      {pending ? (
        <section className="card mb-4 border-o/50" role="status" aria-label="Paiement en cours">
          <h2 className="mb-1 text-lg font-extrabold">Paiement en cours de vérification</h2>
          <p className="text-mut">Plan {PLAN_LABELS[pending.plan]} · {formatFCFA(pending.amount)} · référence {pending.reference}</p>
          <p className="mt-1 text-sm text-mut">Dès que nous avons vérifié votre paiement Wave, votre plan s’active (en général dans la journée).</p>
        </section>
      ) : null}

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        {(["pro", "business"] as const).map((p) => (
          <section key={p} className={`card ${plan === p ? "border-g" : ""}`} aria-label={`Plan ${PLAN_LABELS[p]}`}>
            <h2 className="text-xl font-extrabold">{PLAN_LABELS[p]}</h2>
            <p className="mb-3"><span className="text-3xl font-extrabold">{formatFCFA(PLAN_PRICES[p])}</span><span className="text-mut"> / mois</span></p>
            <ul className="mb-4 space-y-1.5 text-sm">
              {PLAN_LINES[p].map((l) => <li key={l} className="flex gap-2"><span aria-hidden className="text-g">✓</span>{l}</li>)}
            </ul>
            {wave[p] ? (
              <a className="btn btn-orange" href={wave[p]} target="_blank" rel="noopener noreferrer">Payer avec Wave</a>
            ) : (
              <p className="rounded-xl bg-errs px-3 py-2 text-sm font-semibold text-err">Le lien de paiement n’est pas encore configuré. Contactez l’administrateur.</p>
            )}
            {!pending ? (
              <details className="mt-2">
                <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold text-g">J’ai payé : envoyer la référence</summary>
                <PaymentForm plan={p} />
              </details>
            ) : null}
          </section>
        ))}
      </div>

      {requests.length > 0 ? (
        <section className="card" aria-label="Historique">
          <h2 className="mb-2 text-lg font-extrabold">Mes demandes</h2>
          <ul className="divide-y divide-line text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span>{formatDate(r.createdAt)} · {PLAN_LABELS[r.plan]} · {formatFCFA(r.amount)}</span>
                <span className={`font-bold ${r.status === "validated" ? "text-g" : r.status === "rejected" ? "text-err" : "text-mut"}`}>{REQUEST_STATUS[r.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
