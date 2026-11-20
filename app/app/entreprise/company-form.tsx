"use client";

import { useActionState, useRef, useState } from "react";
import { saveCompanyAction } from "@/actions/company";
import type { FormState } from "@/actions/auth";
import { Field, FormMessage, SubmitButton, TextArea } from "@/components/form";
import type { Company } from "@/lib/db/schema";
import { formatPhone } from "@/lib/phone";

const MAX_INPUT_BYTES = 2 * 1024 * 1024; // 2 Mo avant redimensionnement
const MAX_SIDE = 240;

/** Redimensionne l'image à 240 px max et la renvoie en PNG (data URL). */
async function resizeLogo(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

export function CompanyForm({ company, welcome }: { company: Company | null; welcome: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveCompanyAction, {});
  const e = state.errors ?? {};
  const pn = company?.paymentNumbers ?? {};
  // Après une erreur, on réaffiche ce que l'utilisateur avait saisi.
  const v = (name: string, saved?: string | null) => state.values?.[name] ?? saved ?? "";
  const k = (name: string) => `${name}-${state.values ? "e" : "s"}-${state.values?.[name] ?? ""}`;
  const [logo, setLogo] = useState<string | null>(company?.logo ?? null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    setLogoError(null);
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Choisissez une image PNG, JPEG ou WebP.");
      ev.target.value = "";
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setLogoError("Image trop lourde (2 Mo maximum).");
      ev.target.value = "";
      return;
    }
    try {
      setLogo(await resizeLogo(file));
      setRemoved(false);
    } catch {
      setLogoError("Impossible de lire cette image. Essayez un autre fichier.");
    }
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {welcome && !state.message ? <FormMessage ok message="Compte créé. Renseignez votre entreprise : ces informations apparaîtront sur vos documents." /> : null}
      <FormMessage message={state.message} ok={state.ok} />

      <section className="card">
        <h2 className="mb-3 text-lg font-extrabold">Entreprise</h2>
        <Field name="name" label="Nom de l’entreprise" required defaultValue={v("name", company?.name)} key={k("name")} error={e.name} autoComplete="organization" />
        <Field name="tagline" label="Slogan (facultatif)" defaultValue={v("tagline", company?.tagline)} key={k("tagline")} error={e.tagline} placeholder="Ex. Menuiserie et agencement sur mesure" maxLength={120} />

        <div className="mb-4">
          <span className="field-label">Logo</span>
          {logo && !removed ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu local
            <img src={logo} alt="Aperçu du logo" className="mb-2 max-h-16 max-w-[180px] object-contain" />
          ) : null}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} aria-label="Choisir un logo" className="input py-2.5" />
          <input type="hidden" name="logo" value={logo && !removed && logo !== company?.logo ? logo : ""} />
          {removed ? <input type="hidden" name="removeLogo" value="1" /> : null}
          {logo && !removed ? (
            <button
              type="button"
              className="mt-2 min-h-11 cursor-pointer text-sm font-semibold text-err underline"
              onClick={() => {
                setRemoved(true);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Supprimer le logo
            </button>
          ) : null}
          {logoError || e.logo ? <p className="field-error">{logoError ?? e.logo}</p> : <p className="hint">PNG, JPEG ou WebP, 2 Mo maximum. Il sera réduit automatiquement.</p>}
        </div>

        <Field name="rccm" label="RCCM" defaultValue={v("rccm", company?.rccm)} key={k("rccm")} error={e.rccm} placeholder="CI-ABJ-2024-B-00000" />
        <Field name="taxNumber" label="Compte contribuable" defaultValue={v("taxNumber", company?.taxNumber)} key={k("taxNumber")} error={e.taxNumber} />
        <TextArea name="address" label="Adresse" rows={2} defaultValue={v("address", company?.address)} key={k("address")} error={e.address} />
        <Field name="email" label="E-mail de l’entreprise" type="email" inputMode="email" defaultValue={v("email", company?.email)} key={k("email")} error={e.email} placeholder="contact@monentreprise.ci" />
        <Field name="website" label="Site web (facultatif)" defaultValue={v("website", company?.website)} key={k("website")} error={e.website} placeholder="www.monentreprise.ci" />
        <Field name="phone" label="Téléphone de l’entreprise" type="tel" inputMode="tel" defaultValue={v("phone", company?.phone ? formatPhone(company?.phone) : "")} key={k("phone")} error={e.phone} placeholder="07 00 00 00 00" />
      </section>

      <section className="card">
        <h2 className="mb-1 text-lg font-extrabold">Paiements</h2>
        <p className="mb-3 text-mut">Affichés sur vos documents pour que vos clients sachent où payer.</p>
        <TextArea name="bankDetails" label="RIB ou IBAN (virement)" rows={2} defaultValue={v("bankDetails", company?.bankDetails)} key={k("bankDetails")} error={e.bankDetails} hint="Affiché sur les documents quand « Virement » est accepté. Ex. : BICICI CI000 01234 012345678901 23" />
        <Field name="wave" label="Wave" type="tel" inputMode="tel" defaultValue={v("wave", pn.wave ? formatPhone(pn.wave) : "")} key={k("wave")} error={e.wave} />
        <Field name="orangeMoney" label="Orange Money" type="tel" inputMode="tel" defaultValue={v("orangeMoney", pn.orangeMoney ? formatPhone(pn.orangeMoney) : "")} key={k("orangeMoney")} error={e.orangeMoney} />
        <Field name="mtnMoney" label="MTN Money" type="tel" inputMode="tel" defaultValue={v("mtnMoney", pn.mtnMoney ? formatPhone(pn.mtnMoney) : "")} key={k("mtnMoney")} error={e.mtnMoney} />
        <Field name="moovMoney" label="Moov Money" type="tel" inputMode="tel" defaultValue={v("moovMoney", pn.moovMoney ? formatPhone(pn.moovMoney) : "")} key={k("moovMoney")} error={e.moovMoney} />
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-extrabold">Note par défaut</h2>
        <TextArea
          name="defaultNote"
          label="Note ou conditions"
          rows={3}
          defaultValue={v("defaultNote", company?.defaultNote)} key={k("defaultNote")}
          error={e.defaultNote}
          hint="Reprise automatiquement sur vos nouveaux documents. Ex. : Merci pour votre confiance."
        />
      </section>

      <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
    </form>
  );
}
