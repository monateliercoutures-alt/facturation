"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "@/actions/admin";
import { whatsappLink } from "@/lib/documents/share";

export function ResetPassword({ userId, userName, phone }: { userId: string; userName: string; phone: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction.bind(null, userId), {});
  return (
    <div>
      <form
        action={action}
        onSubmit={(e) => {
          if (!window.confirm(`Réinitialiser le mot de passe de ${userName} ? L'ancien ne fonctionnera plus.`)) e.preventDefault();
        }}
      >
        <button className="btn btn-ghost" disabled={pending}>{pending ? "Réinitialisation…" : "Réinitialiser le mot de passe"}</button>
      </form>
      {state.password ? (
        <div role="status" className="mt-2 rounded-xl bg-gs p-3 text-sm">
          <p className="font-semibold text-g">Mot de passe provisoire (affiché une seule fois) :</p>
          <p className="my-1 font-mono text-lg font-bold select-all">{state.password}</p>
          <a className="font-semibold text-g underline" target="_blank" rel="noopener noreferrer" href={whatsappLink(phone, `Bonjour ${userName}, voici votre mot de passe provisoire FactureCI : ${state.password}\nChangez-le dès votre connexion.`)}>
            Envoyer sur WhatsApp
          </a>
        </div>
      ) : null}
      {state.message ? <p role="alert" className="field-error">{state.message}</p> : null}
    </div>
  );
}
