import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-[960px] px-4 pt-4 pb-12">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo href="/admin" />
          <span className="rounded-full bg-o/15 px-2.5 py-1 text-xs font-bold text-o">Admin</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/app" className="flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-g">Mon espace</Link>
          <form action={signOutAction}><button className="min-h-12 cursor-pointer rounded-xl px-3 text-sm font-semibold text-mut">Se déconnecter</button></form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
