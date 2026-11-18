"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { syncDraftAction } from "@/actions/documents";
import { markFailed, queuedFor, remove, type QueuedDraft } from "@/lib/offline-queue";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS_KEY = "factureci:install-dismissed";

/** Service worker, bannière d'installation, état hors connexion et envoi des brouillons au retour du réseau. */
export function PwaManager({ userId }: { userId: string }) {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedDraft[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const syncing = useRef(false);

  const refresh = useCallback(() => setQueue(queuedFor(userId)), [userId]);

  const flush = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    try {
      for (const draft of queuedFor(userId).filter((d) => !d.error)) {
        try {
          const result = await syncDraftAction(draft.payload);
          if (result.ok) {
            remove(draft.id);
            setSentCount((n) => n + 1);
          } else {
            markFailed(draft.id, result.message);
          }
        } catch {
          break; // réseau perdu en route : on réessaiera plus tard, le brouillon reste en file
        }
      }
    } finally {
      syncing.current = false;
      refresh();
    }
  }, [userId, refresh]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    const dismissed = (() => {
      try {
        return localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        return false;
      }
    })();
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (!dismissed && !standalone) setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void flush();
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("factureci:queue", refresh);
    // Mise à jour d'état au chargement : synchronisation asynchrone pour ne pas bloquer l'affichage.
    const t = setTimeout(() => {
      update();
      refresh();
      if (!dismissed && !standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) setIosHint(true);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("factureci:queue", refresh);
    };
  }, [flush, refresh]);

  function dismissInstall() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setInstallEvent(null);
    setIosHint(false);
  }

  const waiting = queue.filter((d) => !d.error);
  const failed = queue.filter((d) => d.error);

  return (
    <div className="space-y-2 empty:hidden">
      {!online ? (
        <p role="status" className="rounded-xl bg-o/15 px-3 py-2.5 text-sm font-semibold">
          Vous êtes hors connexion.{waiting.length ? ` ${waiting.length} brouillon${waiting.length > 1 ? "s" : ""} en attente d’envoi.` : " Vous pouvez créer un document : il sera envoyé au retour du réseau."}
        </p>
      ) : null}
      {online && waiting.length > 0 ? <p role="status" className="rounded-xl bg-gs px-3 py-2.5 text-sm font-semibold text-g">Envoi de {waiting.length} brouillon{waiting.length > 1 ? "s" : ""}…</p> : null}
      {sentCount > 0 && waiting.length === 0 ? (
        <p role="status" className="rounded-xl bg-gs px-3 py-2.5 text-sm font-semibold text-g">
          {sentCount} document{sentCount > 1 ? "s créés" : " créé"} hors connexion {sentCount > 1 ? "ont" : "a"} été envoyé{sentCount > 1 ? "s" : ""}. <Link className="underline" href="/app/documents">Voir mes documents</Link>
        </p>
      ) : null}
      {failed.map((d) => (
        <p key={d.id} role="alert" className="rounded-xl bg-errs px-3 py-2.5 text-sm font-semibold text-err">
          Le brouillon « {d.label} » n’a pas pu être envoyé : {d.error}{" "}
          <button type="button" className="underline" onClick={() => remove(d.id)}>Ignorer</button>
        </p>
      ))}
      {installEvent ? (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card p-3" role="region" aria-label="Installer l’application">
          <p className="flex-1 text-sm font-semibold">Installez FactureCI sur votre téléphone</p>
          <button type="button" className="min-h-12 cursor-pointer rounded-xl bg-g px-4 font-bold text-on" onClick={async () => { await installEvent.prompt(); await installEvent.userChoice; setInstallEvent(null); }}>
            Installer l’application
          </button>
          <button type="button" className="min-h-12 cursor-pointer px-2 text-sm font-semibold text-mut" onClick={dismissInstall} aria-label="Masquer">Plus tard</button>
        </div>
      ) : null}
      {iosHint ? (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card p-3" role="region" aria-label="Installer l’application">
          <p className="flex-1 text-sm">Pour installer l’application : touchez <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.</p>
          <button type="button" className="min-h-12 cursor-pointer px-2 text-sm font-semibold text-mut" onClick={dismissInstall}>Compris</button>
        </div>
      ) : null}
    </div>
  );
}
