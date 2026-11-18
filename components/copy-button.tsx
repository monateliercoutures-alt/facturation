"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copier le lien" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("Copiez ce lien :", text);
        }
      }}
    >
      <span aria-live="polite">{done ? "Lien copié" : label}</span>
    </button>
  );
}
