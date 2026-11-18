import { amountSentence } from "@/lib/documents/words";
import { DOCUMENT_LABELS } from "@/lib/documents/calc";
import type { SheetData } from "@/lib/documents/sheet";
import { formatAmount, formatDate, formatFCFA } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

/** Aperçu du document : même contenu que le PDF. Reste blanc en mode sombre, comme une feuille imprimée. */
export function DocumentSheet({ data }: { data: SheetData }) {
  const isBL = data.type === "BL";
  const label = DOCUMENT_LABELS[data.type];
  return (
    <article aria-label={`${label.singular} ${data.number}`} className="rounded-2xl border border-[#D9E2DB] bg-white p-4 text-[14px] leading-snug text-[#12261C] sm:p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {data.company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL déjà redimensionnée
            <img src={data.company.logo} alt="" className="mb-1.5 max-h-14 max-w-[170px] object-contain" />
          ) : null}
          <p className="text-base font-extrabold">{data.company.name}</p>
          <div className="text-[#5B6B62]">
            {data.company.rccm ? <p>RCCM : {data.company.rccm}</p> : null}
            {data.company.taxNumber ? <p>CC : {data.company.taxNumber}</p> : null}
            {data.company.address ? <p>{data.company.address}</p> : null}
            {data.company.phone ? <p>{formatPhone(data.company.phone)}</p> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-extrabold text-[#0E6B43]">{label.upper}</p>
          <p className="font-bold">{data.number}</p>
          <p className="text-[#5B6B62]">Date : {formatDate(data.issueDate)}</p>
          {data.dueDate && !isBL ? <p className="text-[#5B6B62]">Échéance : {formatDate(data.dueDate)}</p> : null}
        </div>
      </header>

      <section className="mb-4 rounded-xl bg-[#F5F8F4] p-3">
        <p className="text-xs font-bold tracking-wide text-[#5B6B62] uppercase">{isBL ? "Livré à" : "Client"}</p>
        <p className="font-bold">{data.client.name}</p>
        {data.client.phone ? <p>{formatPhone(data.client.phone)}</p> : null}
        {isBL && data.deliveryAddress ? <p>{data.deliveryAddress}</p> : !isBL && data.client.address ? <p>{data.client.address}</p> : null}
      </section>

      <div className="overflow-x-auto">
        <table className="mb-3 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#0E6B43] text-left text-xs text-[#5B6B62] uppercase">
              <th className="py-1.5 pr-2 font-bold">Désignation</th>
              <th className="px-2 py-1.5 text-right font-bold">Qté</th>
              {!isBL ? <th className="px-2 py-1.5 text-right font-bold">Prix unitaire</th> : null}
              {!isBL ? <th className="py-1.5 pl-2 text-right font-bold">Montant</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.items.map((i, n) => (
              <tr key={n} className="border-b border-[#D9E2DB] align-top">
                <td className="py-1.5 pr-2">{i.description}</td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap">{i.quantity}</td>
                {!isBL ? <td className="px-2 py-1.5 text-right whitespace-nowrap">{formatAmount(i.unitPrice)}</td> : null}
                {!isBL ? <td className="py-1.5 pl-2 text-right font-semibold whitespace-nowrap">{formatAmount(Math.round(i.quantity * i.unitPrice))}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isBL ? (
        <>
          <dl className="mb-3 ml-auto w-full max-w-[280px] space-y-1">
            {data.discountAmount > 0 || data.vatAmount > 0 ? (
              <div className="flex justify-between">
                <dt>Sous-total</dt>
                <dd>{formatFCFA(data.subtotal)}</dd>
              </div>
            ) : null}
            {data.discountAmount > 0 ? (
              <div className="flex justify-between">
                <dt>Remise ({data.discountPercent} %)</dt>
                <dd>− {formatFCFA(data.discountAmount)}</dd>
              </div>
            ) : null}
            {data.vatPercent > 0 ? (
              <div className="flex justify-between">
                <dt>TVA ({data.vatPercent} %)</dt>
                <dd>{formatFCFA(data.vatAmount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t-2 border-[#0E6B43] pt-1.5 text-base font-extrabold">
              <dt>Total</dt>
              <dd>{formatFCFA(data.total)}</dd>
            </div>
          </dl>
          <p className="mb-3 italic">{amountSentence(data.total)}</p>

          {data.installments.length > 1 ? (
            <section className="mb-3">
              <p className="mb-1 font-bold">Paiement en tranches</p>
              <ul className="divide-y divide-[#D9E2DB] rounded-xl border border-[#D9E2DB]">
                {data.installments.map((t, n) => (
                  <li key={n} className="flex flex-wrap items-center justify-between gap-x-3 px-3 py-1.5">
                    <span>
                      {t.label}
                      {t.dueDate ? <span className="text-[#5B6B62]"> · avant le {formatDate(t.dueDate)}</span> : null}
                    </span>
                    <span className="font-bold">
                      {formatFCFA(t.amount)}
                      {t.paidAt ? <span className="ml-2 text-xs font-bold text-[#0E6B43]">Payée</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.paymentLines.length > 0 ? (
            <section className="mb-3">
              <p className="mb-0.5 font-bold">Moyens de paiement acceptés</p>
              <p>{data.paymentLines.join(" · ")}</p>
            </section>
          ) : null}
        </>
      ) : null}

      {data.note ? <p className="mb-3 whitespace-pre-line text-[#5B6B62]">{data.note}</p> : null}

      <footer className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-9 font-bold">{isBL ? "Le livreur" : "Le prestataire"}</p>
          <p className="border-t border-[#12261C]/40 pt-1 text-xs text-[#5B6B62]">{isBL && data.deliveredBy ? data.deliveredBy : "Signature"}</p>
        </div>
        <div>
          <p className="mb-9 font-bold">{isBL ? "Reçu par (nom, date, signature)" : "Cachet et signature du client"}</p>
          <p className="border-t border-[#12261C]/40 pt-1 text-xs text-[#5B6B62]">&nbsp;</p>
        </div>
      </footer>
    </article>
  );
}
