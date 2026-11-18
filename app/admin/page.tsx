import type { Metadata } from "next";
import Link from "next/link";
import { changePlanAction, rejectPaymentAction, setSuspendedAction, validatePaymentAction } from "@/actions/admin";
import { ResetPassword } from "@/components/reset-password";
import { getAdminStats, listAdminActions, listAdminUsers, listPendingRequests } from "@/lib/admin/queries";
import { formatDate, formatFCFA } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { isPaidActive, PLAN_LABELS, type PlanKey } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Administration" };

const ACTION_LABELS: Record<string, string> = {
  "payment.validated": "a validé un paiement",
  "payment.rejected": "a rejeté un paiement",
  "plan.changed": "a changé le plan de",
  "user.suspended": "a suspendu",
  "user.reactivated": "a réactivé",
  "password.reset": "a réinitialisé le mot de passe de",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-mut">{label}</p>
      <p className="text-[26px] leading-tight font-extrabold tracking-tight">{value}</p>
      {sub ? <p className="text-sm text-mut">{sub}</p> : null}
    </div>
  );
}

const dateTime = (d: Date) => `${formatDate(d)} ${new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Abidjan", hour: "2-digit", minute: "2-digit" }).format(d)}`;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const { q } = await searchParams;
  const [stats, pending, people, actions] = await Promise.all([getAdminStats(), listPendingRequests(), listAdminUsers(q), listAdminActions()]);
  const now = new Date();

  return (
    <>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Administration</h1>

      <section aria-label="Indicateurs" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Utilisateurs inscrits" value={String(stats.total)} />
        <Stat label="Nouveaux cette semaine" value={String(stats.newThisWeek)} sub="7 derniers jours" />
        <Stat label="Actifs sur 30 jours" value={String(stats.active30)} sub="Au moins un document créé" />
        <Stat label="Abonnés par plan" value={`${stats.byPlan.pro} Pro · ${stats.byPlan.business} Business`} sub={`${stats.byPlan.free} en plan Gratuit`} />
        <Stat label="Revenu mensuel récurrent" value={formatFCFA(stats.mrr)} sub="Plans payants actifs" />
        <Stat label="Conversion gratuit → payant" value={stats.conversionRate === null ? "—" : `${stats.conversionRate} %`} />
      </section>

      <section className="card mb-6" aria-labelledby="pending">
        <h2 id="pending" className="mb-3 text-lg font-extrabold">Demandes de paiement en attente ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-mut">Aucune demande en attente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-line text-left text-mut">
                  <th className="py-2 pr-3 font-semibold">Utilisateur</th><th className="px-3 font-semibold">Plan</th><th className="px-3 text-right font-semibold">Montant</th><th className="px-3 font-semibold">Référence</th><th className="px-3 font-semibold">Date</th><th className="pl-3 font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pending.map(({ request: r, userName, userPhone }) => (
                  <tr key={r.id} className="border-b border-line align-middle">
                    <td className="py-2 pr-3"><span className="block font-semibold">{userName}</span><span className="text-mut">{formatPhone(userPhone)}</span></td>
                    <td className="px-3">{PLAN_LABELS[r.plan]}</td>
                    <td className="px-3 text-right font-bold">{formatFCFA(r.amount)}</td>
                    <td className="px-3 break-all">{r.reference}</td>
                    <td className="px-3 whitespace-nowrap">{dateTime(r.createdAt)}</td>
                    <td className="py-2 pl-3">
                      <div className="flex gap-2">
                        <form action={validatePaymentAction.bind(null, r.id)}><button className="min-h-12 cursor-pointer rounded-xl bg-g px-4 font-bold text-on">Valider</button></form>
                        <form action={rejectPaymentAction.bind(null, r.id)}><button className="min-h-12 cursor-pointer rounded-xl border-[1.5px] border-err px-4 font-bold text-err">Rejeter</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6" aria-labelledby="users">
        <h2 id="users" className="mb-3 text-lg font-extrabold">Utilisateurs</h2>
        <form method="get" role="search" className="card mb-3 flex items-end gap-2">
          <div className="min-w-0 flex-1"><label htmlFor="q" className="field-label">Nom ou téléphone</label><input id="q" name="q" type="search" defaultValue={q ?? ""} className="input" /></div>
          <button className="btn btn-ghost !w-auto px-5">Chercher</button>
        </form>
        {people.length === 0 ? (
          <p className="card text-mut">Aucun utilisateur ne correspond.</p>
        ) : (
          <ul className="space-y-3">
            {people.map((u) => {
              const active = isPaidActive(u, now);
              const self = u.id === admin.id;
              return (
                <li key={u.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold">{u.name} {u.role === "admin" ? <span className="ml-1 rounded-full bg-o/15 px-2 py-0.5 text-xs text-o">Admin</span> : null} {u.suspendedAt ? <span className="ml-1 rounded-full bg-errs px-2 py-0.5 text-xs text-err">Suspendu</span> : null}</p>
                      <p className="text-sm text-mut">{formatPhone(u.phone)} · inscrit le {formatDate(u.createdAt)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-bold">{PLAN_LABELS[u.plan as PlanKey]}{u.plan !== "free" && !active ? " (expiré)" : ""}</p>
                      <p className="text-mut">{u.planExpiresAt ? `jusqu'au ${formatDate(u.planExpiresAt)}` : "sans expiration"} · {u.documents} document{u.documents > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <form action={changePlanAction.bind(null, u.id)} className="flex gap-2">
                      <label className="sr-only" htmlFor={`plan-${u.id}`}>Plan de {u.name}</label>
                      <select id={`plan-${u.id}`} name="plan" defaultValue={u.plan} className="input min-w-0 flex-1">
                        {(Object.keys(PLAN_LABELS) as PlanKey[]).map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                      </select>
                      <button className="min-h-12 cursor-pointer rounded-xl border-[1.5px] border-g px-3 font-bold text-g">Changer de plan</button>
                    </form>
                    {self ? <p className="hint self-center">C’est votre compte.</p> : <form action={setSuspendedAction.bind(null, u.id, !u.suspendedAt)}><button className={`min-h-12 w-full cursor-pointer rounded-xl border-[1.5px] font-bold ${u.suspendedAt ? "border-g text-g" : "border-err text-err"}`}>{u.suspendedAt ? "Réactiver" : "Suspendre"}</button></form>}
                    <ResetPassword userId={u.id} userName={u.name} phone={u.phone} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="journal">
        <h2 id="journal" className="mb-3 text-lg font-extrabold">Journal des actions</h2>
        {actions.length === 0 ? (
          <p className="text-mut">Aucune action pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {actions.map(({ action: a, adminName, targetName }) => (
              <li key={a.id} className="py-2 text-sm">
                <p><span className="font-bold">{adminName}</span> {ACTION_LABELS[a.action] ?? a.action}{targetName ? <> <span className="font-bold">{targetName}</span></> : null}
                  {a.details.plan ? ` · plan ${PLAN_LABELS[a.details.plan as PlanKey] ?? a.details.plan}` : ""}{a.details.to ? ` · ${PLAN_LABELS[a.details.from as PlanKey]} → ${PLAN_LABELS[a.details.to as PlanKey]}` : ""}{typeof a.details.amount === "number" ? ` · ${formatFCFA(a.details.amount)}` : ""}</p>
                <p className="text-mut">{dateTime(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-4 text-center text-sm text-mut"><Link href="/app" className="underline">Retour à mon espace</Link></p>
    </>
  );
}
