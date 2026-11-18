"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type FormState } from "@/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export function SignUpForm() {
  const [state, action] = useActionState<FormState, FormData>(signUpAction, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="card" noValidate>
      <FormMessage message={state.message} />
      <Field name="name" label="Votre nom" autoComplete="name" required defaultValue={v.name} error={e.name} key={`name-${v.name}`} />
      <Field
        name="phone"
        label="Numéro de téléphone (WhatsApp)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="07 00 00 00 00"
        required
        defaultValue={v.phone}
        error={e.phone}
        hint="Il vous servira à vous connecter."
        key={`phone-${v.phone}`}
      />
      <Field name="email" label="E-mail (facultatif)" type="email" autoComplete="email" defaultValue={v.email} error={e.email} key={`email-${v.email}`} />
      <Field name="password" label="Mot de passe" type="password" autoComplete="new-password" required minLength={8} error={e.password} hint="8 caractères minimum." />
      <Field name="confirm" label="Confirmez le mot de passe" type="password" autoComplete="new-password" required error={e.confirm} />
      <SubmitButton pendingLabel="Création du compte…">Créer mon compte</SubmitButton>
      <p className="mt-4 text-center text-sm text-mut">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-g underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
