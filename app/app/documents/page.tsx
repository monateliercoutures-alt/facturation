import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { DOCUMENT_LABELS, DOCUMENT_TYPES, STATUS_LABELS, type DocumentStatus } from "@/lib/documents/calc";
import { listDocuments } from "@/lib/documents/service";
import { formatDate, formatFCFA } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Mes documents" };

type Search = { q?: string; type?: string; status?: string };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const type = (DOCUMENT_TYPES as readonly string[]).includes(sp.type ?? "") ? sp.type : undefined;
  const status = Object.keys(STATUS_LABELS).includes(sp.status ?? "") ? sp.status : undefined;
  const rows = await listDocuments(user.id, { q: sp.q, type, status });
  const filtered = Boolean(sp.q || type || status);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Mes documents</h1>
        <Link href="/app/documents/nouveau" className="btn !w-auto px-4">+ Nouveau</Link>
      </div>

      <form method="get" role="search" className="card mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <label htmlFor="q" className="field-label">Client ou numéro</label>
          <input id="q" name="q" type="search" defaultValue={sp.q ?? ""} className="input" placeholder="Ex. Brou ou FAC-2026-001" />
        </div>
        <div>
          <label htmlFor="type" className="field-label">Type</label>
          <select id="type" name="type" defaultValue={type ?? ""} className="input">
            <option value="">Tous</option>
            {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{DOCUMENT_LABELS[t].plural}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="field-label">Statut</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">Tous</option>
            {(Object.keys(STATUS_LABELS) as DocumentStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn-ghost sm:self-end">Filtrer</button>
      </form>

      {rows.length === 0 ? (
        <section className="card text-center">
          <h2 className="mb-1 text-lg font-extrabold">{filtered ? "Aucun document ne correspond" : "Aucun document pour l’instant"}</h2>
          <p className="mb-4 text-mut">{filtered ? "Essayez un autre mot, ou retirez les filtres." : "Créez votre première facture en moins d’une minute."}</p>
          {filtered ? (
            <Link href="/app/documents" className="btn btn-ghost">Retirer les filtres</Link>
          ) : (
            <Link href="/app/documents/nouveau" className="btn btn-orange">Créer ma première facture</Link>
          )}
        </section>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/app/documents/${r.id}`} className="card block no-underline hover:border-g">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold">{r.number}</p>
                    <p className="truncate text-mut">{r.clientName ?? "Client supprimé"} · {formatDate(r.issueDate)}</p>
                  </div>
                  <StatusPill status={r.status} type={r.type} />
                </div>
                {DOCUMENT_LABELS[r.type].priced ? (
                  <p className="mt-2 font-bold">
                    {formatFCFA(r.total)}
                    {r.type === "FAC" && r.paid > 0 && r.paid < r.total ? <span className="ml-2 text-sm font-normal text-mut">dont {formatFCFA(r.paid)} payés</span> : null}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
