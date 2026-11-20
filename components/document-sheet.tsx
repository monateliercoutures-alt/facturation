import { deriveSheet, type SheetData } from "@/lib/documents/sheet";
import { amountSentence } from "@/lib/documents/words";
import { formatAmount, formatDate, formatFCFA } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

const GREEN = "#0E6B43";

/** Aperçu du document : même contenu que le PDF. Reste blanc en mode sombre, comme une feuille imprimée. */
export function DocumentSheet({ data }: { data: SheetData }) {
  const d = deriveSheet(data);
  const { traits, isBL } = d;
  const shipTo = isBL ? (data.deliveryAddress ?? data.client.address) : data.deliveryAddress;

  return (
    <article aria-label={`${traits.singular} ${data.number}`} className="rounded-2xl border border-[#D9E2DB] bg-white p-4 text-[14px] leading-snug text-[#12261C] sm:p-6">
      <header className="mb-4 flex items-start justify-between gap-3 border-b-[3px] pb-4" style={{ borderColor: GREEN }}>
        <div className="min-w-0">
          {data.company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL déjà redimensionnée
            <img src={data.company.logo} alt="" className="mb-1.5 max-h-14 max-w-[170px] object-contain" />
          ) : null}
          <p className="text-lg leading-tight font-extrabold">{data.company.name}</p>
          {data.company.tagline ? <p className="italic text-[#5B6B62]">{data.company.tagline}</p> : null}
          <div className="mt-1 text-[#5B6B62]">
            {data.company.address ? <p>{data.company.address}</p> : null}
            {d.contact.length ? <p>{d.contact.join(" · ")}</p> : null}
            {d.identity.length ? <p>{d.identity.join(" · ")}</p> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl leading-tight font-extrabold" style={{ color: GREEN }}>{traits.upper}</p>
          <p className="text-base font-bold">N° {data.number}</p>
          <p className="text-[#5B6B62]">Date : {formatDate(data.issueDate)}</p>
          {data.dueDate ? <p className="font-semibold">{traits.dueLabel} : {formatDate(data.dueDate)}</p> : null}
          {data.clientReference ? <p className="text-[#5B6B62]">Réf. : {data.clientReference}</p> : null}
        </div>
      </header>

      <section className={`mb-4 grid gap-3 ${d.showShipTo ? "sm:grid-cols-2" : ""}`}>
        <div className="rounded-xl bg-[#F5F8F4] p-3">
          <p className="mb-0.5 text-xs font-bold tracking-wide text-[#5B6B62] uppercase">{traits.party}</p>
          <p className="font-bold">{data.client.name}</p>
          {isBL ? (shipTo ? <p>{shipTo}</p> : null) : data.client.address ? <p>{data.client.address}</p> : null}
          {data.client.phone ? <p>{formatPhone(data.client.phone)}</p> : null}
          {data.client.email ? <p>{data.client.email}</p> : null}
        </div>
        {d.showShipTo ? (
          <div className="rounded-xl bg-[#F5F8F4] p-3">
            <p className="mb-0.5 text-xs font-bold tracking-wide text-[#5B6B62] uppercase">Livraison</p>
            <p>{data.deliveryAddress}</p>
          </div>
        ) : null}
      </section>

      {data.subject ? (
        <p className="mb-3">
          <span className="font-bold">Objet :</span> {data.subject}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="mb-3 w-full border-collapse">
          <thead>
            <tr className="text-left text-xs text-white uppercase" style={{ background: GREEN }}>
              <th className="px-2 py-2 font-bold">Désignation</th>
              <th className="px-2 py-2 text-right font-bold">{isBL ? "Commandé" : "Qté"}</th>
              {isBL ? <th className="px-2 py-2 text-right font-bold">Livré</th> : null}
              {d.showUnit ? <th className="px-2 py-2 font-bold">Unité</th> : null}
              {!isBL ? <th className="px-2 py-2 text-right font-bold">Prix unitaire</th> : null}
              {!isBL ? <th className="px-2 py-2 text-right font-bold">Montant</th> : null}
              {d.showObservations ? <th className="px-2 py-2 font-bold">Observations</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.items.map((i, n) => (
              <tr key={n} className={`align-top ${n % 2 ? "bg-[#F5F8F4]" : ""}`}>
                <td className="px-2 py-1.5">{i.description}</td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap">{i.quantity}</td>
                {isBL ? <td className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">{i.quantityDelivered ?? i.quantity}</td> : null}
                {d.showUnit ? <td className="px-2 py-1.5 whitespace-nowrap">{i.unit ?? ""}</td> : null}
                {!isBL ? <td className="px-2 py-1.5 text-right whitespace-nowrap">{formatAmount(i.unitPrice)}</td> : null}
                {!isBL ? <td className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">{formatAmount(Math.round(i.quantity * i.unitPrice))}</td> : null}
                {d.showObservations ? <td className="px-2 py-1.5">{i.observation ?? ""}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {traits.priced ? (
        <>
          <dl className="mb-3 ml-auto w-full max-w-[300px] space-y-1">
            {data.discountAmount > 0 || d.hasVat ? (
              <div className="flex justify-between">
                <dt>{data.discountAmount > 0 ? "Sous-total" : "Total HT"}</dt>
                <dd>{formatFCFA(data.subtotal)}</dd>
              </div>
            ) : null}
            {data.discountAmount > 0 ? (
              <div className="flex justify-between">
                <dt>Remise ({data.discountPercent} %)</dt>
                <dd>− {formatFCFA(data.discountAmount)}</dd>
              </div>
            ) : null}
            {data.discountAmount > 0 && d.hasVat ? (
              <div className="flex justify-between">
                <dt>Total HT</dt>
                <dd>{formatFCFA(d.netHt)}</dd>
              </div>
            ) : null}
            {d.hasVat ? (
              <div className="flex justify-between">
                <dt>TVA ({data.vatPercent} %)</dt>
                <dd>{formatFCFA(data.vatAmount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between rounded-lg px-2 py-1.5 text-base font-extrabold text-white" style={{ background: GREEN }}>
              <dt>{d.totalLabel}</dt>
              <dd>{formatFCFA(data.total)}</dd>
            </div>
            {d.paid > 0 && d.paid < data.total ? (
              <>
                <div className="flex justify-between">
                  <dt>Déjà réglé</dt>
                  <dd>− {formatFCFA(d.paid)}</dd>
                </div>
                <div className="flex justify-between font-extrabold">
                  <dt>Reste à payer</dt>
                  <dd>{formatFCFA(d.remaining)}</dd>
                </div>
              </>
            ) : null}
          </dl>
          <p className="mb-3 italic">{amountSentence(data.total)}</p>

          {data.installments.length > 1 ? (
            <section className="mb-3">
              <p className="mb-1 font-bold">Conditions de règlement</p>
              <ul className="divide-y divide-[#D9E2DB] rounded-xl border border-[#D9E2DB]">
                {data.installments.map((t, n) => (
                  <li key={n} className="flex flex-wrap items-center justify-between gap-x-3 px-3 py-1.5">
                    <span>
                      {t.label}
                      {t.dueDate ? <span className="text-[#5B6B62]"> · avant le {formatDate(t.dueDate)}</span> : null}
                    </span>
                    <span className="font-bold">
                      {formatFCFA(t.amount)}
                      {t.paidAt ? <span className="ml-2 text-xs font-bold" style={{ color: GREEN }}>Payée</span> : null}
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
              {d.bankVisible ? <p className="mt-1 whitespace-pre-line"><span className="font-semibold">Coordonnées bancaires :</span> {data.company.bankDetails}</p> : null}
            </section>
          ) : null}
        </>
      ) : null}

      {data.note ? <p className="mb-3 whitespace-pre-line text-[#5B6B62]">{data.note}</p> : null}

      <footer className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#F5F8F4] p-3">
          <p className="mb-9 text-xs font-bold">{traits.signLeft}</p>
          <p className="border-t border-[#12261C]/40 pt-1 text-xs text-[#5B6B62]">{isBL && data.deliveredBy ? data.deliveredBy : "Signature"}</p>
        </div>
        <div className="rounded-xl bg-[#F5F8F4] p-3">
          <p className="mb-9 text-xs font-bold">{traits.signRight}</p>
          <p className="border-t border-[#12261C]/40 pt-1 text-xs text-[#5B6B62]">Date et signature</p>
        </div>
      </footer>

      <div className="mt-5 border-t border-[#D9E2DB] pt-3 text-center text-xs text-[#5B6B62]">
        {traits.priced ? <p className="mb-1 font-semibold text-[#12261C]">Merci de votre confiance.{d.contact.length ? ` Une question sur ce document ? ${d.contact.slice(0, 2).join(" · ")}` : ""}</p> : null}
        {[data.company.name, ...d.identity].join(" · ")}
      </div>
    </article>
  );
}
