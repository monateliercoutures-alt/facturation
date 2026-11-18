import { renderDocumentPdf, pdfFilename } from "@/lib/documents/pdf";
import { getDocumentByToken } from "@/lib/documents/service";
import { toSheet } from "@/lib/documents/to-sheet";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getDocumentByToken(token);
  if (!view) return new Response("Document introuvable.", { status: 404 });
  const data = toSheet(view);
  const pdf = await renderDocumentPdf(data);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdfFilename(data)}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
