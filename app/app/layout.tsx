import { signOutAction } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { PwaManager } from "@/components/pwa";
import { SignOutForm } from "@/components/signout-form";
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
          <SignOutForm action={signOutAction} className="min-h-12 cursor-pointer rounded-xl px-3 text-sm font-semibold text-mut" />
        </div>
      </header>
      <NavLinks
        links={[
          { href: "/app", label: "Accueil" },
          { href: "/app/documents", label: "Documents" },
          { href: "/app/entreprise", label: "Entreprise" },
          { href: "/app/compte", label: "Compte" },
          ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
        ]}
      />
      <div className="mt-3 empty:hidden"><PwaManager userId={user.id} /></div>
      <main className="mt-5">{children}</main>
    </div>
  );
}
