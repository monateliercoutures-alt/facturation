import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelDocumentAction, markDeliveredAction, setInstallmentPaidAction } from "@/actions/documents";
import { CopyButton } from "@/components/copy-button";
import { DocumentSheet } from "@/components/document-sheet";
import { StatusPill } from "@/components/status-pill";
import { DOCUMENT_LABELS, PAYMENT_METHODS, todayISO } from "@/lib/documents/calc";
import { emailSender } from "@/lib/documents/email";
import { getDocumentForUser } from "@/lib/documents/service";
import { documentMessage, publicUrl, smsLink, whatsappLink } from "@/lib/documents/share";
import { toSheet } from "@/lib/documents/to-sheet";
import { formatDate, formatFCFA } from "@/lib/format";
import { appOrigin } from "@/lib/origin";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { PLAN_FEATURES } from "@/lib/plans";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const user = await requireUser();
  const [{ id }, { cree }] = await Promise.all([params, searchParams]);
  const view = await getDocumentForUser(user.id, id);
  if (!view) notFound();

  const { doc, client } = view;
  const label = DOCUMENT_LABELS[doc.type];
  const link = publicUrl(doc.shareToken, await appOrigin());
  const message = documentMessage(view, link);
  const mail = emailSender.kind === "link" ? emailSender.prepare({ to: client?.email ?? null, subject: `${label.singular} ${doc.number}`, body: message }).href : null;
  const today = todayISO();
  const cancelled = view.status === "cancelled";
  const feminine = label.feminine;
  const paidTotal = view.installments.filter((i) => i.paidAt).reduce((s, i) => s + i.amount, 0);

  return (
    <>
      {cree === "1" ? (
        <p role="status" className="mb-4 rounded-xl bg-gs px-3 py-2.5 text-sm font-semibold text-g">
          {label.singular} {doc.number} enregistré{feminine ? "e" : ""}. Envoyez-le à votre client ci-dessous.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{doc.number}</h1>
          <p className="text-mut">{client?.name ?? "Client"} · {formatDate(doc.issueDate)}</p>
        </div>
        <StatusPill status={view.status} type={doc.type} />
      </div>

      {!cancelled ? (
        <section className="card mb-4" aria-label="Envoyer">
          <a className="btn btn-orange" href={whatsappLink(client?.phone, message)} target="_blank" rel="noopener noreferrer">Envoyer sur WhatsApp</a>
          {mail && PLAN_FEATURES[view.ownerPlan].email ? <a className="btn mt-2" href={mail}>Envoyer par e-mail</a> : null}
          {!PLAN_FEATURES[view.ownerPlan].email ? <div className="mt-2"><UpgradeNotice compact title="L’envoi par e-mail est réservé au plan Pro" /></div> : null}
          <a className="btn btn-ghost mt-2" href={`/app/documents/${doc.id}/pdf`} target="_blank" rel="noopener noreferrer">Télécharger le PDF</a>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <CopyButton text={link} />
            {client?.phone ? <a className="btn btn-ghost" href={smsLink(client.phone, message)}>Envoyer par SMS</a> : <a className="btn btn-ghost" href={link} target="_blank" rel="noopener noreferrer">Voir le lien client</a>}
          </div>
          {!client?.phone ? <p className="hint">Ajoutez le numéro WhatsApp du client en dupliquant le document pour l’envoyer directement.</p> : null}
        </section>
      ) : null}

      {doc.type === "FAC" && view.installments.length > 0 ? (
        <section className="card mb-4" aria-label="Paiements">
          <h2 className="mb-1 text-lg font-extrabold">Paiements</h2>
          <p className="mb-3 text-mut">{formatFCFA(paidTotal)} reçus sur {formatFCFA(doc.total)}</p>
          <ul className="space-y-3">
            {view.installments.map((i) => (
              <li key={i.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-bold">{i.label}{i.dueDate ? <span className="font-normal text-mut"> · avant le {formatDate(i.dueDate)}</span> : null}</span>
                  <span className="font-extrabold">{formatFCFA(i.amount)}</span>
                </div>
                {i.paidAt ? (
                  <form action={setInstallmentPaidAction.bind(null, doc.id)} className="mt-2 flex items-center justify-between gap-2">
                    <input type="hidden" name="installmentId" value={i.id} />
                    <p className="text-sm font-semibold text-g">Payée le {formatDate(i.paidAt)}{i.method ? ` · ${PAYMENT_METHODS.find((m) => m.key === i.method)?.label ?? i.method}` : ""}</p>
                    <button name="action" value="unpay" className="min-h-11 cursor-pointer text-sm font-semibold text-mut underline">Annuler</button>
                  </form>
                ) : null}
                {i.paidAt && client?.phone ? (
                  <a className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-g underline" target="_blank" rel="noopener noreferrer" href={whatsappLink(client.phone, `Bonjour ${client.name}, nous confirmons la réception de votre paiement de ${formatFCFA(i.amount)} (${i.label.toLowerCase()}) pour la facture ${doc.number}. Merci pour votre confiance.`)}>
                    Confirmer le paiement au client sur WhatsApp
                  </a>
                ) : null}
                {!i.paidAt && !cancelled ? (
                  <form action={setInstallmentPaidAction.bind(null, doc.id)} className="mt-2 grid grid-cols-2 gap-2">
                    <input type="hidden" name="installmentId" value={i.id} />
                    <div>
                      <label className="field-label" htmlFor={`d-${i.id}`}>Date</label>
                      <input id={`d-${i.id}`} className="input" type="date" name="paidAt" defaultValue={today} max={today} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor={`m-${i.id}`}>Moyen</label>
                      <select id={`m-${i.id}`} className="input" name="method" defaultValue={doc.paymentMethods[0] ?? ""}>
                        <option value="">—</option>
                        {PAYMENT_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                      </select>
                    </div>
                    <button name="action" value="pay" className="btn col-span-2">Marquer payée</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card mb-4" aria-label="Autres actions">
        <h2 className="mb-2 text-lg font-extrabold">Autres actions</h2>
        <div className="grid gap-2">
          <Link className="btn btn-ghost" href={`/app/documents/nouveau?from=${doc.id}&mode=duplicate`}>Dupliquer</Link>
          {doc.type === "DEV" || doc.type === "PRO" ? <Link className="btn btn-ghost" href={`/app/documents/nouveau?from=${doc.id}&mode=facture`}>Transformer en facture</Link> : null}
          {doc.type === "DEV" ? <Link className="btn btn-ghost" href={`/app/documents/nouveau?from=${doc.id}&mode=pro`}>Créer une facture pro forma</Link> : null}
          {doc.type === "FAC" ? <Link className="btn btn-ghost" href={`/app/documents/nouveau?from=${doc.id}&mode=bl`}>Créer un bon de livraison</Link> : null}
          {doc.type === "BL" && view.status !== "delivered" ? (
            <form action={markDeliveredAction.bind(null, doc.id)}><button className="btn">Marquer comme livré</button></form>
          ) : null}
          {doc.type !== "BL" && !cancelled ? (
            <form action={cancelDocumentAction.bind(null, doc.id)}><button className="min-h-12 w-full cursor-pointer rounded-xl border-[1.5px] border-err font-bold text-err">Annuler ce document</button></form>
          ) : null}
        </div>
      </section>

      <DocumentSheet data={toSheet(view)} />
    </>
  );
}
