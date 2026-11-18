"use client";

import { useMemo, useState, useTransition } from "react";
import { createDocumentAction } from "@/actions/documents";
import { DocumentSheet } from "@/components/document-sheet";
import {
  computeTotals,
  defaultDeposit,
  DOCUMENT_LABELS,
  installmentLabels,
  ITEM_TEMPLATES,
  PAYMENT_METHODS,
  splitInstallments,
  type PaymentMethodKey,
} from "@/lib/documents/calc";
import { paymentLinesFor, type SheetData } from "@/lib/documents/sheet";
import type { PaymentNumbers } from "@/lib/db/schema";
import { formatFCFA } from "@/lib/format";
import { enqueue } from "@/lib/offline-queue";
import { formatPhone } from "@/lib/phone";

type DocType = "FAC" | "DEV" | "BL";
type ClientOption = { id: string; name: string; phone: string | null; email: string | null; address: string | null };
type CompanyInfo = { name: string; logo: string | null; rccm: string | null; taxNumber: string | null; address: string | null; phone: string | null; paymentNumbers: PaymentNumbers; defaultNote: string | null };

export type FormInitial = {
  type: DocType;
  sourceDocumentId: string | null;
  client: { id: string | null; name: string; phone: string; email: string; address: string };
  items: { description: string; quantity: string; unitPrice: string }[];
  discountPercent: number;
  vatPercent: 0 | 18;
  dueDate: string;
  note: string;
  paymentMethods: PaymentMethodKey[];
  count: number;
  deliveredBy: string;
};

const MOBILE_FIELDS = PAYMENT_METHODS.filter((m) => m.mobile);

export function DocumentForm({ initial, company, clients, today, mention, userId }: { initial: FormInitial; company: CompanyInfo; clients: ClientOption[]; today: string; mention: boolean; userId: string }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<DocType>(initial.type);
  const [client, setClient] = useState(initial.client);
  const [items, setItems] = useState(initial.items);
  const [discount, setDiscount] = useState(String(initial.discountPercent || ""));
  const [vat, setVat] = useState<0 | 18>(initial.vatPercent);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [note, setNote] = useState(initial.note);
  const [methods, setMethods] = useState<PaymentMethodKey[]>(initial.paymentMethods);
  const [numbers, setNumbers] = useState<Record<string, string>>(() => Object.fromEntries(MOBILE_FIELDS.map((m) => [m.mobile!, company.paymentNumbers[m.mobile!] ? formatPhone(company.paymentNumbers[m.mobile!]!) : ""])));
  const [count, setCount] = useState(initial.count);
  const [deposit, setDeposit] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<{ key: string; values: number[] } | null>(null);
  const [instDates, setInstDates] = useState<string[]>(["", "", "", "", "", ""]);
  const [deliveredBy, setDeliveredBy] = useState(initial.deliveredBy);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [queued, setQueued] = useState(false);

  const isBL = type === "BL";
  const parsedItems = items.map((i) => ({ description: i.description.trim(), quantity: Number(i.quantity.replace(",", ".")), unitPrice: isBL ? 0 : Math.round(Number(i.unitPrice) || 0) }));
  const discountPercent = Math.min(100, Math.max(0, Number(discount.replace(",", ".")) || 0));
  const totals = computeTotals(parsedItems.map((i) => ({ quantity: Number.isFinite(i.quantity) ? i.quantity : 0, unitPrice: i.unitPrice })), discountPercent, vat);

  // Tranches : calcul automatique, modifiable à la main tant que total/nombre/acompte ne changent pas.
  const effectiveDeposit = deposit === null ? defaultDeposit(totals.total, count) : Math.round(Number(deposit) || 0);
  const autoKey = `${totals.total}|${count}|${effectiveDeposit}`;
  const amounts = overrides?.key === autoKey ? overrides.values : splitInstallments(totals.total, count, effectiveDeposit);
  const amountsSum = amounts.reduce((a, b) => a + b, 0);
  const sumOk = amountsSum === totals.total;
  const labels = installmentLabels(count);

  const sheet: SheetData = useMemo(
    () => ({
      type,
      number: "À attribuer",
      issueDate: today,
      dueDate: dueDate || null,
      company: { name: company.name, logo: company.logo, rccm: company.rccm, taxNumber: company.taxNumber, address: company.address, phone: company.phone },
      client: { name: client.name || "Nom du client", phone: client.phone || null, address: isBL ? null : client.address || null },
      items: parsedItems.map((i) => ({ description: i.description || "…", quantity: Number.isFinite(i.quantity) ? i.quantity : 0, unitPrice: i.unitPrice })),
      ...totals,
      discountPercent,
      vatPercent: vat,
      installments: isBL ? [] : amounts.map((amount, n) => ({ label: labels[n], amount, dueDate: instDates[n] || (count === 1 ? dueDate || null : null), paidAt: null })),
      paymentLines: isBL ? [] : paymentLinesFor(methods, Object.fromEntries(MOBILE_FIELDS.map((m) => [m.mobile!, numbers[m.mobile!] || company.paymentNumbers[m.mobile!]])) as PaymentNumbers),
      note: note || null,
      deliveryAddress: isBL ? client.address || null : null,
      deliveredBy: deliveredBy || null,
      mention,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcul à chaque saisie
    [type, today, dueDate, company, client, items, discount, vat, count, deposit, overrides, instDates, methods, numbers, note, deliveredBy],
  );

  function pickClientName(name: string) {
    const match = clients.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (match) setClient({ id: match.id, name: match.name, phone: match.phone ? formatPhone(match.phone) : "", email: match.email ?? "", address: match.address ?? "" });
    else setClient((c) => ({ ...c, id: null, name }));
  }

  function setItem(index: number, patch: Partial<(typeof items)[number]>) {
    setItems((list) => list.map((it, n) => (n === index ? { ...it, ...patch } : it)));
  }

  function applyTemplate(label: string) {
    setItems((list) => {
      const i = list.findIndex((x) => !x.description.trim());
      if (i >= 0) return list.map((x, n) => (n === i ? { ...x, description: label } : x));
      return [...list, { description: label, quantity: "1", unitPrice: "" }];
    });
  }

  function next() {
    setError(null);
    if (step === 1 && !client.name.trim()) return setError("Entrez le nom du client.");
    if (step === 2) {
      if (parsedItems.some((i) => !i.description)) return setError("Décrivez chaque ligne, ou supprimez-la.");
      if (parsedItems.some((i) => !(i.quantity > 0))) return setError("Chaque quantité doit être supérieure à 0.");
      if (!isBL && totals.total <= 0) return setError("Ajoutez au moins une ligne avec un prix.");
    }
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  }

  function save() {
    setError(null);
    if (!isBL && !sumOk) return setError(`La somme des tranches (${formatFCFA(amountsSum)}) doit être égale au total (${formatFCFA(totals.total)}).`);
    const payload = {
      type,
      sourceDocumentId: initial.sourceDocumentId,
      client: { id: client.id, name: client.name, phone: client.phone, email: client.email, address: client.address },
      items: parsedItems,
      discountPercent: isBL ? 0 : discountPercent,
      vatPercent: isBL ? 0 : vat,
      issueDate: today,
      dueDate: isBL ? null : dueDate || null,
      note,
      paymentMethods: isBL ? [] : methods,
      paymentNumbers: isBL ? {} : Object.fromEntries(MOBILE_FIELDS.filter((m) => methods.includes(m.key) && numbers[m.mobile!]?.trim()).map((m) => [m.mobile!, numbers[m.mobile!]])),
      installments: isBL ? { count: 1, amounts: [], dueDates: [] } : { count, amounts, dueDates: amounts.map((_, n) => (count === 1 ? dueDate || null : instDates[n] || null)) },
      deliveryAddress: isBL ? client.address : null,
      deliveredBy: isBL ? deliveredBy : null,
    };
    // Hors connexion : le brouillon est gardé sur le téléphone et envoyé au retour du réseau.
    const queueDraft = () => {
      if (enqueue(userId, payload, `${DOCUMENT_LABELS[type].singular} · ${client.name}`)) setQueued(true);
      else setError("Impossible d'enregistrer le brouillon sur ce téléphone (stockage plein ?).");
    };
    if (!navigator.onLine) return queueDraft();
    startTransition(async () => {
      let result;
      try {
        result = await createDocumentAction(payload);
      } catch (e) {
        if (!navigator.onLine) return queueDraft();
        throw e; // redirection après succès, ou vraie erreur : laissée à Next.js
      }
      if (result && !result.ok) {
        setError(result.message);
        setStep(result.errors && Object.keys(result.errors).some((k) => k.startsWith("client")) ? 1 : result.errors && Object.keys(result.errors).some((k) => k.startsWith("items")) ? 2 : step);
      }
    });
  }

  const label = DOCUMENT_LABELS[type].singular;
  if (queued) {
    return (
      <section className="card text-center" role="status">
        <h2 className="mb-1 text-xl font-extrabold">Brouillon enregistré sur votre téléphone</h2>
        <p className="mb-4 text-mut">Pas de réseau pour le moment. Votre {label.toLowerCase()} pour {client.name} sera créé et envoyé automatiquement dès que la connexion revient.</p>
        <a href="/app" className="btn">Retour à l’accueil</a>
      </section>
    );
  }
  return (
    <div>
      <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label="Progression">
        <i className="block h-full bg-o transition-all" style={{ width: `${step * 33.4}%` }} />
      </div>
      <p className="mb-4 text-sm text-mut">Étape {step} sur 3</p>

      {step === 1 ? (
        <section>
          <h2 className="mb-3 text-2xl leading-tight font-extrabold tracking-tight">Pour qui est ce document ?</h2>
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Type de document">
            {(["FAC", "DEV", "BL"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={`min-h-11 cursor-pointer rounded-full border-[1.5px] px-4 text-sm font-semibold ${type === t ? "border-g bg-g text-on" : "border-line bg-card"}`}>
                {DOCUMENT_LABELS[t].singular}
              </button>
            ))}
          </div>
          <div className="card">
            <label className="field-label" htmlFor="c-name">Nom du client</label>
            <input id="c-name" className="input mb-4" list="clients" value={client.name} onChange={(e) => pickClientName(e.target.value)} placeholder="Ex. Monsieur Brou" autoComplete="off" />
            <datalist id="clients">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            <label className="field-label" htmlFor="c-phone">WhatsApp du client</label>
            <input id="c-phone" className="input mb-4" type="tel" inputMode="tel" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} placeholder="07 00 00 00 00" />
            <label className="field-label" htmlFor="c-mail">E-mail du client (facultatif)</label>
            <input id="c-mail" className="input" type="email" inputMode="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} placeholder="client@exemple.com" />
            {isBL ? (
              <>
                <label className="field-label mt-4" htmlFor="c-addr">Adresse de livraison</label>
                <input id="c-addr" className="input" value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} placeholder="Quartier, commune, repère" />
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <h2 className="mb-3 text-2xl leading-tight font-extrabold tracking-tight">{isBL ? "Que livrez-vous ?" : "Qu’avez-vous vendu ?"}</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {ITEM_TEMPLATES.map((t) => (
              <button key={t} type="button" onClick={() => applyTemplate(t)} className="min-h-11 cursor-pointer rounded-full border-[1.5px] border-line bg-card px-3.5 text-sm">
                {t}
              </button>
            ))}
          </div>
          <div className="card mb-3 space-y-4">
            {items.map((it, n) => (
              <div key={n} className="space-y-2 border-b border-line pb-4 last:border-0 last:pb-0">
                <input className="input" aria-label={`Description de la ligne ${n + 1}`} placeholder="Description" value={it.description} onChange={(e) => setItem(n, { description: e.target.value })} />
                <div className="flex items-center gap-2">
                  <input className="input !w-20" aria-label="Quantité" type="text" inputMode="decimal" value={it.quantity} onChange={(e) => setItem(n, { quantity: e.target.value })} />
                  {!isBL ? <input className="input min-w-0 flex-1" aria-label="Prix unitaire en FCFA" type="text" inputMode="numeric" placeholder="Prix unitaire" value={it.unitPrice} onChange={(e) => setItem(n, { unitPrice: e.target.value.replace(/[^\d]/g, "") })} /> : <span className="flex-1" />}
                  <button type="button" aria-label={`Supprimer la ligne ${n + 1}`} disabled={items.length === 1} onClick={() => setItems((l) => l.filter((_, i) => i !== n))} className="min-h-12 min-w-12 cursor-pointer text-2xl text-mut disabled:opacity-30">
                    ×
                  </button>
                </div>
              </div>
            ))}
            {!isBL ? (
              <p className="flex justify-between text-base font-extrabold" aria-live="polite">
                <span>Total</span>
                <span>{formatFCFA(totals.subtotal)}</span>
              </p>
            ) : null}
          </div>
          <button type="button" onClick={() => setItems((l) => [...l, { description: "", quantity: "1", unitPrice: "" }])} className="min-h-12 cursor-pointer font-bold text-g underline">
            + Ajouter une ligne
          </button>
        </section>
      ) : null}

      {step === 3 && !isBL ? (
        <section>
          <h2 className="mb-3 text-2xl leading-tight font-extrabold tracking-tight">Conditions et paiement</h2>
          <div className="card mb-3">
            <label className="field-label" htmlFor="discount">Remise (%)</label>
            <input id="discount" className="input mb-4" type="text" inputMode="decimal" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <label className="field-label" htmlFor="vat">TVA</label>
            <select id="vat" className="input mb-4" value={vat} onChange={(e) => setVat(Number(e.target.value) === 18 ? 18 : 0)}>
              <option value={0}>Non applicable</option>
              <option value={18}>18 %</option>
            </select>
            <label className="field-label" htmlFor="due">Date d’échéance</label>
            <input id="due" className="input mb-4" type="date" min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <label className="field-label" htmlFor="note">Note ou conditions</label>
            <textarea id="note" className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="card mb-3">
            <label className="field-label" htmlFor="count">Nombre de tranches</label>
            <select id="count" className="input" value={count} onChange={(e) => { setCount(Number(e.target.value)); setDeposit(null); }}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 1 ? "1 (paiement comptant)" : n}</option>)}
            </select>
            {count > 1 ? (
              <>
                <label className="field-label mt-4" htmlFor="deposit">Premier versement (acompte)</label>
                <input id="deposit" className="input" type="text" inputMode="numeric" value={deposit ?? String(effectiveDeposit)} onChange={(e) => setDeposit(e.target.value.replace(/[^\d]/g, ""))} />
                <ul className="mt-4 space-y-3">
                  {amounts.map((a, n) => (
                    <li key={n} className="grid grid-cols-[1fr_auto] items-end gap-2">
                      <div>
                        <label className="field-label" htmlFor={`amt-${n}`}>{labels[n]}</label>
                        <input id={`amt-${n}`} className="input" type="text" inputMode="numeric" value={String(a)} onChange={(e) => setOverrides({ key: autoKey, values: amounts.map((v, i) => (i === n ? Number(e.target.value.replace(/[^\d]/g, "")) || 0 : v)) })} />
                      </div>
                      <input className="input !w-40" type="date" aria-label={`Échéance : ${labels[n]}`} min={today} value={instDates[n]} onChange={(e) => setInstDates((d) => d.map((v, i) => (i === n ? e.target.value : v)))} />
                    </li>
                  ))}
                </ul>
                <p role={sumOk ? "status" : "alert"} className={`mt-3 text-sm font-semibold ${sumOk ? "text-g" : "text-err"}`}>
                  {sumOk ? `Total des tranches : ${formatFCFA(amountsSum)}` : amountsSum < totals.total ? `Il manque ${formatFCFA(totals.total - amountsSum)} pour atteindre ${formatFCFA(totals.total)}.` : `Il y a ${formatFCFA(amountsSum - totals.total)} en trop par rapport au total de ${formatFCFA(totals.total)}.`}
                </p>
                {overrides?.key === autoKey ? (
                  <button type="button" className="mt-1 min-h-11 cursor-pointer text-sm font-semibold text-g underline" onClick={() => setOverrides(null)}>
                    Répartir automatiquement
                  </button>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="card mb-3">
            <p className="field-label">Moyens de paiement acceptés</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => {
                const on = methods.includes(m.key);
                return (
                  <button key={m.key} type="button" aria-pressed={on} onClick={() => setMethods((l) => (on ? l.filter((k) => k !== m.key) : [...l, m.key]))} className={`min-h-11 cursor-pointer rounded-full border-[1.5px] px-3.5 text-sm ${on ? "border-g bg-g text-on" : "border-line bg-card"}`}>
                    {m.label}
                  </button>
                );
              })}
            </div>
            {MOBILE_FIELDS.filter((m) => methods.includes(m.key)).map((m) => (
              <div key={m.key} className="mb-3 last:mb-0">
                <label className="field-label" htmlFor={`num-${m.key}`}>Numéro {m.label}</label>
                <input id={`num-${m.key}`} className="input" type="tel" inputMode="tel" placeholder="07 00 00 00 00" value={numbers[m.mobile!] ?? ""} onChange={(e) => setNumbers((n) => ({ ...n, [m.mobile!]: e.target.value }))} />
              </div>
            ))}
            {methods.some((k) => MOBILE_FIELDS.some((m) => m.key === k)) ? <p className="hint">Ces numéros sont mémorisés dans le profil de votre entreprise.</p> : null}
          </div>
        </section>
      ) : null}

      {step === 3 && isBL ? (
        <section>
          <h2 className="mb-3 text-2xl leading-tight font-extrabold tracking-tight">Votre bon de livraison</h2>
          <div className="card mb-3">
            <label className="field-label" htmlFor="by">Livré par (facultatif)</label>
            <input id="by" className="input mb-4" value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)} />
            <label className="field-label" htmlFor="bl-note">Note</label>
            <textarea id="bl-note" className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="mb-4">
          <h3 className="mb-2 text-lg font-extrabold">Aperçu</h3>
          <DocumentSheet data={sheet} />
        </section>
      ) : null}

      {error ? <p role="alert" className="mb-3 rounded-xl bg-errs px-3 py-2.5 text-sm font-semibold text-err">{error}</p> : null}

      {step < 3 ? (
        <button type="button" className="btn mt-3" onClick={next}>Continuer</button>
      ) : (
        <button type="button" className="btn btn-orange mt-3" onClick={save} disabled={pending} aria-busy={pending}>
          {pending ? "Enregistrement…" : `Enregistrer ${label === "Devis" ? "le" : "la"} ${label.toLowerCase()}`.replace("la bon", "le bon")}
        </button>
      )}
      {step > 1 ? (
        <button type="button" className="mt-2 min-h-12 w-full cursor-pointer font-semibold text-g" onClick={() => { setError(null); setStep(step - 1); window.scrollTo({ top: 0 }); }}>
          Retour
        </button>
      ) : null}
    </div>
  );
}
