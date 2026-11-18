import { DOCUMENT_LABELS, methodLabel, PAYMENT_METHODS } from "@/lib/documents/calc";
import type { DocumentView } from "@/lib/documents/service";
import { formatDate, formatFCFA } from "@/lib/format";
import { formatPhone, normalizePhone } from "@/lib/phone";

export function publicUrl(token: string, base = process.env.APP_URL ?? ""): string {
  return `${base.replace(/\/$/, "")}/d/${token}`;
}

/** Moyens de paiement avec le numéro quand il est connu : « Wave (+225 07 00 00 00 00) ». */
export function paymentMethodLines(view: Pick<DocumentView, "doc" | "company">): string[] {
  const numbers = view.company?.paymentNumbers ?? {};
  return view.doc.paymentMethods.map((key) => {
    const mobile = PAYMENT_METHODS.find((m) => m.key === key)?.mobile;
    const number = mobile ? numbers[mobile] : undefined;
    return number ? `${methodLabel(key)} : ${formatPhone(number)}` : methodLabel(key);
  });
}

export function documentMessage(view: DocumentView, link: string): string {
  const { doc, company, client, installments } = view;
  const label = DOCUMENT_LABELS[doc.type].singular;
  const lines: string[] = [`Bonjour ${client?.name ?? ""},`.replace(" ,", ","), ""];
  const from = company?.name ? ` de ${company.name}` : "";
  if (!DOCUMENT_LABELS[doc.type].priced) {
    lines.push(`Voici votre ${label.toLowerCase()} ${doc.number}${from}.`);
  } else {
    lines.push(`Voici votre ${label.toLowerCase()} ${doc.number}${from} d'un montant de ${formatFCFA(doc.total)}.`);
    if (installments.length > 1) {
      lines.push("", "Paiement en tranches :");
      for (const i of installments) lines.push(`- ${i.label} : ${formatFCFA(i.amount)}${i.dueDate ? ` (avant le ${formatDate(i.dueDate)})` : ""}`);
    } else if (doc.dueDate) {
      lines.push(`À régler avant le ${formatDate(doc.dueDate)}.`);
    }
    const methods = paymentMethodLines(view);
    if (methods.length) lines.push("", "Moyens de paiement :", ...methods.map((m) => `- ${m}`));
  }
  lines.push("", `Consulter et télécharger le PDF : ${link}`, "", "Merci pour votre confiance.");
  return lines.join("\n");
}

/** wa.me exige des chiffres sans « + ». normalizePhone ajoute déjà le préfixe 225 aux numéros à 10 chiffres. */
export function whatsappLink(phone: string | null | undefined, message: string): string {
  const normalized = phone ? normalizePhone(phone) : null;
  const target = normalized ? normalized.slice(1) : "";
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(email: string | null | undefined, subject: string, body: string): string {
  return `mailto:${email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function smsLink(phone: string | null | undefined, message: string): string {
  return `sms:${phone ?? ""}?&body=${encodeURIComponent(message)}`;
}
