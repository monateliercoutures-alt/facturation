import type { Metadata } from "next";
import Link from "next/link";
import { setSuspendedAction } from "@/actions/admin";
import { ResetPassword } from "@/components/reset-password";
import { getAdminStats, listAdminActions, listAdminUsers } from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Administration" };

const ACTION_LABELS: Record<string, string> = {
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
  const [stats, people, actions] = await Promise.all([getAdminStats(), listAdminUsers(q), listAdminActions()]);

  return (
    <>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Administration</h1>

      <section aria-label="Indicateurs" className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        <Stat label="Utilisateurs inscrits" value={String(stats.total)} />
        <Stat label="Nouveaux cette semaine" value={String(stats.newThisWeek)} sub="7 derniers jours" />
        <Stat label="Actifs sur 30 jours" value={String(stats.active30)} sub="Au moins un document créé" />
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
              const self = u.id === admin.id;
              return (
                <li key={u.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold">{u.name} {u.role === "admin" ? <span className="ml-1 rounded-full bg-o/15 px-2 py-0.5 text-xs text-o">Admin</span> : null} {u.suspendedAt ? <span className="ml-1 rounded-full bg-errs px-2 py-0.5 text-xs text-err">Suspendu</span> : null}</p>
                      <p className="text-sm text-mut">{formatPhone(u.phone)} · inscrit le {formatDate(u.createdAt)}</p>
                    </div>
                    <p className="text-sm text-mut">{u.documents} document{u.documents > 1 ? "s" : ""}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
                <p><span className="font-bold">{adminName}</span> {ACTION_LABELS[a.action] ?? a.action}{targetName ? <> <span className="font-bold">{targetName}</span></> : null}</p>
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
