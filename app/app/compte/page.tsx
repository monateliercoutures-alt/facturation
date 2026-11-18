import type { Metadata } from "next";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser();
  const rows: [string, string][] = [
    ["Nom", user.name],
    ["Téléphone", formatPhone(user.phone)],
    ["E-mail", user.email ?? "Non renseigné"],
    ["Plan", { free: "Gratuit", pro: "Pro", business: "Business" }[user.plan]],
    ["Expiration du plan", user.planExpiresAt ? formatDate(user.planExpiresAt) : "—"],
  ];
  return (
    <>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Mon compte</h1>
      <dl className="card divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <dt className="text-mut">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="hint mt-3">Pour changer votre mot de passe ou votre numéro, contactez l’administrateur.</p>
    </>
  );
}
