import { statusLabel, type DocumentStatus } from "@/lib/documents/calc";

const STYLES: Record<DocumentStatus, string> = {
  draft: "bg-line text-mut",
  sent: "bg-gs text-g",
  partial: "bg-[#FFE9CF] text-[#8a4a00] dark:bg-[#3a2a10] dark:text-[#ffbf7a]",
  paid: "bg-g text-on",
  overdue: "bg-errs text-err",
  cancelled: "bg-line text-mut line-through",
  delivered: "bg-g text-on",
};

export function StatusPill({ status, type }: { status: DocumentStatus; type?: "FAC" | "DEV" | "BL" }) {
  const label = statusLabel(status, type);
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STYLES[status]}`}>{label}</span>;
}
