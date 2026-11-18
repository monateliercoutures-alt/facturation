import { methodLabel } from "@/lib/documents/calc";
import { whatsappLink } from "@/lib/documents/share";
import type { DueRow } from "@/lib/stats/dashboard";
import { formatDate, formatFCFA } from "@/lib/format";

/** Message de relance poli, prérempli pour WhatsApp (jamais d'envoi automatique). */
export function reminderMessage(row: DueRow, company: string | null): string {
  const lines = [`Bonjour ${row.clientName},`, ""];
  if (row.daysLate > 0) {
    lines.push(
      `Sauf erreur de ma part, la ${row.label.toLowerCase()} de ${formatFCFA(row.amount)} de la facture ${row.number} était attendue le ${formatDate(row.dueDate)} et reste à régler.`,
    );
  } else {
    lines.push(`Petit rappel amical : la ${row.label.toLowerCase()} de ${formatFCFA(row.amount)} de la facture ${row.number} arrive à échéance le ${formatDate(row.dueDate)}.`);
  }
  if (row.paymentMethods.length) lines.push("", `Vous pouvez payer par : ${row.paymentMethods.map(methodLabel).join(", ")}.`);
  lines.push("", "Si le paiement est déjà parti, merci d'ignorer ce message.", "Merci pour votre confiance.");
  if (company) lines.push(company);
  return lines.join("\n");
}

export function reminderLink(row: DueRow, company: string | null): string {
  return whatsappLink(row.clientPhone, reminderMessage(row, company));
}
