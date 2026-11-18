import Link from "next/link";
import type { DueRow } from "@/lib/stats/dashboard";
import { reminderLink } from "@/lib/stats/reminder";
import { formatDate, formatFCFA } from "@/lib/format";

/** Tranches à relancer : cartes empilées (lisibles sur téléphone), avec relance WhatsApp prérempli. */
export function DueList({ rows, company, late }: { rows: DueRow[]; company: string | null; late?: boolean }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.installmentId} className="rounded-xl border border-line p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{r.clientName}</p>
              <p className="text-sm text-mut">
                <Link href={`/app/documents/${r.documentId}`} className="underline">{r.number}</Link> · {r.label}
              </p>
            </div>
            <p className="shrink-0 text-right font-extrabold">{formatFCFA(r.amount)}</p>
          </div>
          <p className={`mt-1 text-sm font-semibold ${late ? "text-err" : "text-mut"}`}>
            {late ? `${r.daysLate} jour${r.daysLate > 1 ? "s" : ""} de retard · échéance le ${formatDate(r.dueDate)}` : r.daysLate === 0 ? `À payer aujourd'hui` : `Échéance le ${formatDate(r.dueDate)}`}
          </p>
          {r.clientPhone ? (
            <a href={reminderLink(r, company)} target="_blank" rel="noopener noreferrer" className="btn btn-orange mt-2">Relancer sur WhatsApp</a>
          ) : (
            <p className="hint">Pas de numéro WhatsApp pour ce client.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
