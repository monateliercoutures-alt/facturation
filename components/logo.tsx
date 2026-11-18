import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="text-[22px] font-extrabold tracking-tight text-ink no-underline">
      Facture<span className="text-o">CI</span>
    </Link>
  );
}
