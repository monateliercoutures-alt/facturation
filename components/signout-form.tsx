"use client";

/** Déconnexion : vide d'abord le cache des pages utilisateur du service worker (téléphone partagé). */
export function SignOutForm({ action, className }: { action: () => void | Promise<void>; className?: string }) {
  return (
    <form action={action} onSubmit={() => navigator.serviceWorker?.controller?.postMessage("clear")}>
      <button type="submit" className={className}>Se déconnecter</button>
    </form>
  );
}
