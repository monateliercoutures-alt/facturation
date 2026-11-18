"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type FormState } from "@/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="card" noValidate>
      <FormMessage message={state.message} />
      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
      <Field
        name="phone"
        label="Numéro de téléphone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="07 00 00 00 00"
        required
        defaultValue={v.phone}
        error={e.phone}
        key={`phone-${v.phone}`}
      />
      <Field name="password" label="Mot de passe" type="password" autoComplete="current-password" required error={e.password} />
      <SubmitButton pendingLabel="Connexion…">Se connecter</SubmitButton>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <Link href="/mot-de-passe-oublie" className="font-semibold text-g underline">
          Mot de passe oublié ?
        </Link>
        <p className="text-mut">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-semibold text-g underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </form>
  );
}
