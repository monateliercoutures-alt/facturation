import { renderDocumentPdf, pdfFilename } from "@/lib/documents/pdf";
import { getDocumentForUser } from "@/lib/documents/service";
import { toSheet } from "@/lib/documents/to-sheet";
import { requireUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const view = await getDocumentForUser(user.id, id);
  if (!view) return new Response("Document introuvable.", { status: 404 });
  const data = toSheet(view);
  const pdf = await renderDocumentPdf(data);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pdfFilename(data)}"`, "Cache-Control": "private, no-store" },
  });
}
