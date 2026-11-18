import Link from "next/link";
import { DueList } from "@/components/due-list";
import { MethodDonut, MonthlyBars } from "@/components/charts";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { StatusPill } from "@/components/status-pill";
import { methodLabel, type DocumentStatus } from "@/lib/documents/calc";
import type { Dashboard } from "@/lib/stats/dashboard";
import { monthLabel, PERIOD_KEYS, PERIOD_LABELS, type Period } from "@/lib/stats/period";
import { formatDate, formatFCFA } from "@/lib/format";

type Recent = { id: string; type: "FAC" | "DEV" | "BL"; number: string; status: DocumentStatus; clientName: string | null; total: number };

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "bad" | "good" }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-mut">{label}</p>
      <p className={`text-[26px] leading-tight font-extrabold tracking-tight ${tone === "bad" ? "text-err" : tone === "good" ? "text-g" : ""}`}>{value}</p>
      {sub ? <p className="text-sm text-mut">{sub}</p> : null}
    </div>
  );
}

export function DashboardView({ d, period, recent, company, full, canCsv }: { d: Dashboard; period: Period; recent: Recent[]; company: string | null; full: boolean; canCsv: boolean }) {
  const qs = (p: Period) => (p.key === "custom" ? `p=custom&from=${p.from}&to=${p.to}` : `p=${p.key}`);
  const hasData = d.invoiced > 0 || d.toCollect > 0 || d.monthly.some((m) => m.invoiced > 0) || recent.length > 0;
  return (
    <>
      <nav aria-label="Période" className="mb-2 flex gap-2 overflow-x-auto pb-1">
        {PERIOD_KEYS.filter((k) => k !== "custom").map((k) => (
          <Link key={k} href={`/app?p=${k}`} aria-current={period.key === k ? "true" : undefined} className={`flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] px-3.5 text-sm font-semibold no-underline ${period.key === k ? "border-g bg-g text-on" : "border-line bg-card"}`}>
            {PERIOD_LABELS[k]}
          </Link>
        ))}
      </nav>
      <details className="mb-3" open={period.key === "custom"}>
        <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold text-g">{PERIOD_LABELS.custom}</summary>
        <form method="get" className="card grid grid-cols-2 gap-3">
          <input type="hidden" name="p" value="custom" />
          <div><label className="field-label" htmlFor="from">Du</label><input id="from" name="from" type="date" required defaultValue={period.from} className="input" /></div>
          <div><label className="field-label" htmlFor="to">Au</label><input id="to" name="to" type="date" required defaultValue={period.to} className="input" /></div>
          <button className="btn col-span-2">Afficher</button>
        </form>
      </details>
      <p className="mb-4 text-sm text-mut">Du {formatDate(period.from)} au {formatDate(period.to)}</p>

      <section className="mb-5 grid gap-2 sm:grid-cols-3" aria-label="Créer un document">
        <Link href="/app/documents/nouveau?type=FAC" className="btn">+ Facture</Link>
        <Link href="/app/documents/nouveau?type=DEV" className="btn btn-ghost">+ Devis</Link>
        <Link href="/app/documents/nouveau?type=BL" className="btn btn-ghost">+ Bon de livraison</Link>
      </section>

      {!hasData ? (
        <section className="card mb-5 text-center">
          <h2 className="mb-1 text-lg font-extrabold">Bienvenue sur FactureCI</h2>
          <p className="mb-4 text-mut">Vos chiffres apparaîtront ici dès votre première facture.</p>
          <Link href="/app/documents/nouveau?type=FAC" className="btn btn-orange">Créer ma première facture</Link>
        </section>
      ) : null}

      <section aria-label="Indicateurs" className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <Kpi label="Facturé" value={formatFCFA(d.invoiced)} sub="Factures émises sur la période" />
        <Kpi label="Encaissé" value={formatFCFA(d.collected)} sub="Paiements reçus sur la période" tone="good" />
        <Kpi label="À encaisser" value={formatFCFA(d.toCollect)} sub="Reste dû, toutes périodes" />
        <Kpi label="En retard" value={formatFCFA(d.overdue.amount)} sub={d.overdue.invoices ? `${d.overdue.invoices} facture${d.overdue.invoices > 1 ? "s" : ""} · ${d.overdue.installments} tranche${d.overdue.installments > 1 ? "s" : ""}` : "Aucun retard"} tone={d.overdue.amount > 0 ? "bad" : undefined} />
        <Kpi label="Devis en attente" value={String(d.quotes.pending)} sub={d.quotes.conversionRate === null ? "Taux de conversion : pas de devis sur la période" : `Taux de conversion : ${d.quotes.conversionRate} % (${d.quotes.converted} sur ${d.quotes.created})`} />
        <Kpi label="Bons de livraison" value={String(d.deliveries)} sub="Sur la période" />
      </section>

      {full ? (
        <>
      <section className="card mb-5">
        <h2 className="mb-2 text-lg font-extrabold">Facturé et encaissé, 12 mois</h2>
        <MonthlyBars data={d.monthly.map((m) => ({ label: monthLabel(m.month), invoiced: m.invoiced, collected: m.collected }))} />
      </section>

      <div className="mb-5 grid gap-5 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 text-lg font-extrabold">Encaissé par moyen de paiement</h2>
          <MethodDonut data={d.byMethod.map((m) => ({ name: m.method === "unknown" ? "Non précisé" : methodLabel(m.method), amount: m.amount }))} />
        </section>
        <section className="card">
          <h2 className="mb-2 text-lg font-extrabold">Meilleurs clients</h2>
          {d.topClients.length === 0 ? (
            <p className="text-mut">Aucune facture sur cette période.</p>
          ) : (
            <ol className="space-y-2">
              {d.topClients.map((c, i) => (
                <li key={c.clientId ?? c.name} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-gs text-xs font-bold text-g">{i + 1}</span><span className="truncate">{c.name}</span></span>
                  <span className="shrink-0 font-bold">{formatFCFA(c.amount)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card mb-5">
        <h2 className="mb-3 text-lg font-extrabold">À encaisser cette semaine</h2>
        {d.dueThisWeek.length === 0 ? <p className="text-mut">Aucune échéance dans les 7 prochains jours.</p> : <DueList rows={d.dueThisWeek} company={company} />}
      </section>

      <section className="card mb-5">
        <h2 className="mb-3 text-lg font-extrabold">Factures en retard</h2>
        {d.overdueRows.length === 0 ? <p className="text-mut">Aucune facture en retard. Bravo !</p> : <DueList rows={d.overdueRows} company={company} late />}
      </section>

        </>
      ) : (
        <section className="mb-5" aria-label="Tableau de bord complet">
          <UpgradeNotice title="Le tableau de bord complet est réservé au plan Pro">
            Graphiques sur 12 mois, encaissements par moyen de paiement, meilleurs clients, échéances de la semaine et relances WhatsApp en un clic.
          </UpgradeNotice>
        </section>
      )}

      <section className="card mb-5">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-extrabold">Derniers documents</h2><Link href="/app/documents" className="text-sm font-semibold text-g underline">Tout voir</Link></div>
        {recent.length === 0 ? (
          <><p className="mb-3 text-mut">Vous n’avez pas encore de document.</p><Link href="/app/documents/nouveau?type=FAC" className="btn btn-orange">Créer ma première facture</Link></>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={`/app/documents/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 no-underline">
                  <span className="min-w-0"><span className="block font-bold">{r.number}</span><span className="block truncate text-sm text-mut">{r.clientName ?? "Client"}{r.type !== "BL" ? ` · ${formatFCFA(r.total)}` : ""}</span></span>
                  <StatusPill status={r.status} type={r.type} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canCsv ? (
      <section className="card" aria-label="Export">
        <h2 className="mb-1 text-lg font-extrabold">Export pour votre comptable</h2>
        <p className="mb-3 text-mut">Fichiers CSV (Excel) pour la période affichée.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <a className="btn btn-ghost" href={`/app/export?kind=documents&${qs(period)}`} download>Exporter les documents</a>
          <a className="btn btn-ghost" href={`/app/export?kind=payments&${qs(period)}`} download>Exporter les paiements</a>
        </div>
      </section>
      ) : (
        <UpgradeNotice plan="business" title="L’export CSV pour votre comptable est réservé au plan Business" />
      )}
    </>
  );
}
