import Link from "next/link";

/** Fonction réservée à un plan supérieur : explication claire et bouton, jamais une erreur. */
export function UpgradeNotice({ title, children, plan = "pro", compact }: { title: string; children?: React.ReactNode; plan?: "pro" | "business"; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-o/50 bg-o/10 ${compact ? "p-3" : "p-4"}`} role="note">
      <p className="font-extrabold">{title}</p>
      {children ? <p className="mt-0.5 text-sm text-mut">{children}</p> : null}
      <Link href="/app/abonnement" className="btn btn-orange mt-3">
        Passez au plan {plan === "business" ? "Business" : "Pro"}
      </Link>
    </div>
  );
}
