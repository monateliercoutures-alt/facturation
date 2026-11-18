import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentSheet } from "@/components/document-sheet";
import { Logo } from "@/components/logo";
import { getDocumentByToken } from "@/lib/documents/service";
import { toSheet } from "@/lib/documents/to-sheet";

// Page privée : accessible seulement avec le lien, jamais indexée.
export const metadata: Metadata = { title: "Votre document", robots: { index: false, follow: false } };

export default async function PublicDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getDocumentByToken(token);
  if (!view) notFound();
  return (
    <div className="mx-auto max-w-[720px] px-4 pt-4 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <Logo href="/" />
      </header>
      <main>
        <a className="btn mb-4" href={`/d/${token}/pdf`}>Télécharger le PDF</a>
        <DocumentSheet data={toSheet(view)} />
        <p className="mt-6 text-center text-sm text-mut">Document établi avec FactureCI</p>
      </main>
    </div>
  );
}
