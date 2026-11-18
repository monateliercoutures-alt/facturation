/**
 * Couche d'envoi d'e-mails. Aujourd'hui : lien mailto (ouvre l'application de messagerie du
 * téléphone). Pour brancher Resend plus tard, écrivez un `EmailSender` qui appelle l'API avec le
 * PDF en pièce jointe, puis remplacez `emailSender` : aucun autre fichier n'est à modifier.
 */
import { mailtoLink } from "@/lib/documents/share";

export type OutgoingEmail = { to: string | null; subject: string; body: string; pdf?: { filename: string; content: Buffer } };

export type EmailSender =
  | { kind: "link"; prepare(mail: OutgoingEmail): { href: string } }
  | { kind: "api"; send(mail: OutgoingEmail): Promise<void> };

export const mailtoSender: EmailSender = {
  kind: "link",
  prepare: (mail) => ({ href: mailtoLink(mail.to, mail.subject, mail.body) }),
};

/** Expéditeur actif. */
export const emailSender: EmailSender = mailtoSender;
