"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="flex gap-1 rounded-xl border border-line bg-card p-1">
      {links.map((l) => {
        const active = l.href === "/app" ? pathname === "/app" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-[9px] px-2 text-sm font-semibold ${active ? "bg-g text-on" : "text-mut"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
