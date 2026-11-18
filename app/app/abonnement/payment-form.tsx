"use client";

import { useActionState } from "react";
import { requestPaymentAction, type PaymentFormState } from "@/actions/subscription";
import { FormMessage, SubmitButton } from "@/components/form";

export function PaymentForm({ plan }: { plan: "pro" | "business" }) {
  const [state, action] = useActionState<PaymentFormState, FormData>(requestPaymentAction, {});
  return (
    <form action={action} className="mt-3" noValidate>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="plan" value={plan} />
      <label className="field-label" htmlFor={`ref-${plan}`}>Référence Wave ou numéro qui a payé</label>
      <input id={`ref-${plan}`} name="reference" className="input mb-3" required minLength={3} maxLength={60} placeholder="Ex. T_XXXXXXXX ou 07 00 00 00 00" autoComplete="off" />
      <SubmitButton pendingLabel="Envoi…">J’ai payé, envoyer</SubmitButton>
    </form>
  );
}
