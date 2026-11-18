import { signOutAction } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-[720px] px-4 pt-4 pb-12">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Logo href="/app" />
        <div className="flex items-center gap-2">
          {user.role === "admin" ? <span className="rounded-full bg-o/15 px-2.5 py-1 text-xs font-bold text-o">Admin</span> : null}
          <form action={signOutAction}>
            <button type="submit" className="min-h-12 cursor-pointer rounded-xl px-3 text-sm font-semibold text-mut">
              Se déconnecter
            </button>
          </form>
        </div>
      </header>
      <NavLinks
        links={[
          { href: "/app", label: "Accueil" },
          { href: "/app/documents", label: "Documents" },
          { href: "/app/entreprise", label: "Entreprise" },
          { href: "/app/compte", label: "Compte" },
        ]}
      />
      <main className="mt-5">{children}</main>
    </div>
  );
}
