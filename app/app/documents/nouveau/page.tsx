import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "@/lib/company";
import { DOCUMENT_TYPES, PAYMENT_METHODS, todayISO, TYPE_TRAITS, type PaymentMethodKey } from "@/lib/documents/calc";
import { getDocumentForUser, listClientNames } from "@/lib/documents/service";
import { formatPhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";
import { DocumentForm, type FormInitial } from "./document-form";

export const metadata: Metadata = { title: "Nouveau document" };

type Search = { type?: string; from?: string; mode?: string };

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const company = await getCompanyForUser(user.id);

  if (!company) {
    return (
      <section className="card">
        <h1 className="mb-1 text-xl font-extrabold">Renseignez d’abord votre entreprise</h1>
        <p className="mb-3 text-mut">Son nom, son logo et vos numéros Mobile Money apparaissent sur chaque document.</p>
        <Link href="/app/entreprise" className="btn btn-orange">
          Renseigner mon entreprise
        </Link>
      </section>
    );
  }

  const clients = await listClientNames(user.id);
  const wanted = DOCUMENT_TYPES.find((t) => t === sp.type) ?? "FAC";
  const savedMethods = PAYMENT_METHODS.filter((m) => m.mobile && company.paymentNumbers[m.mobile]).map((m) => m.key);

  let initial: FormInitial = {
    type: wanted,
    sourceDocumentId: null,
    client: { id: null, name: "", phone: "", email: "", address: "" },
    deliveryAddress: "",
    subject: "",
    clientReference: "",
    items: [{ description: "", quantity: "1", unitPrice: "", unit: "", delivered: "", observation: "" }],
    discountPercent: 0,
    vatPercent: 0,
    dueDate: "",
    note: company.defaultNote ?? "",
    paymentMethods: savedMethods,
    count: 1,
    deliveredBy: "",
  };

  // Duplication, devis → facture / pro forma, facture → bon de livraison : on part d'un document existant (vérifié par user_id).
  if (sp.from) {
    const src = await getDocumentForUser(user.id, sp.from);
    if (!src) redirect("/app/documents");
    const from = src.doc.type;
    const type =
      sp.mode === "facture" && (from === "DEV" || from === "PRO") ? "FAC" : sp.mode === "pro" && from === "DEV" ? "PRO" : sp.mode === "bl" && (from === "FAC" || from === "PRO") ? "BL" : from;
    const traits = TYPE_TRAITS[type];
    initial = {
      type,
      sourceDocumentId: sp.mode === "duplicate" ? null : src.doc.id,
      client: {
        id: src.client?.id ?? null,
        name: src.client?.name ?? "",
        phone: src.client?.phone ? formatPhone(src.client.phone) : "",
        email: src.client?.email ?? "",
        address: src.client?.address ?? "",
      },
      deliveryAddress: src.doc.deliveryAddress ?? "",
      subject: src.doc.subject ?? "",
      clientReference: src.doc.clientReference ?? "",
      items: src.items.map((i) => ({
        description: i.description,
        quantity: String(i.quantity),
        unitPrice: i.unitPrice ? String(i.unitPrice) : "",
        unit: i.unit ?? "",
        delivered: type === "BL" ? String(i.quantity) : "",
        observation: "",
      })),
      discountPercent: traits.priced ? src.doc.discountPercent : 0,
      vatPercent: traits.priced && src.doc.vatPercent === 18 ? 18 : 0,
      dueDate: "",
      note: src.doc.note ?? "",
      paymentMethods: (src.doc.paymentMethods as PaymentMethodKey[]).length ? (src.doc.paymentMethods as PaymentMethodKey[]) : savedMethods,
      count: traits.payment ? Math.max(1, Math.min(6, src.installments.length || 1)) : 1,
      deliveredBy: "",
    };
  }

  const heading = sp.mode === "facture" ? "Transformer en facture" : sp.mode === "pro" ? "Facture pro forma depuis le devis" : sp.mode === "bl" ? "Bon de livraison depuis la facture" : sp.mode === "duplicate" ? "Dupliquer le document" : "Nouveau document";
  return (
    <>
      <h1 className="sr-only">{heading}</h1>
      <DocumentForm
        key={`${sp.from ?? "new"}-${sp.mode ?? ""}-${wanted}`}
        initial={initial}
        today={todayISO()}
        userId={user.id}
        company={{
          name: company.name,
          logo: company.logo,
          rccm: company.rccm,
          taxNumber: company.taxNumber,
          address: company.address,
          phone: company.phone,
          email: company.email,
          website: company.website,
          tagline: company.tagline,
          bankDetails: company.bankDetails,
          paymentNumbers: company.paymentNumbers,
          defaultNote: company.defaultNote,
        }}
        clients={clients}
      />
    </>
  );
}
