import { Document, Image, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { DOCUMENT_LABELS } from "@/lib/documents/calc";
import type { SheetData } from "@/lib/documents/sheet";
import { amountSentence } from "@/lib/documents/words";
import { formatAmount, formatDate, formatFCFA } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

const GREEN = "#0E6B43";
const MUTED = "#5B6B62";
const LINE = "#D9E2DB";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#12261C", lineHeight: 1.35 },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  logo: { maxHeight: 44, maxWidth: 140, marginBottom: 4, objectFit: "contain" },
  company: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  muted: { color: MUTED },
  right: { textAlign: "right" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GREEN, marginBottom: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  box: { backgroundColor: "#F5F8F4", padding: 8, borderRadius: 6, marginBottom: 12 },
  small: { fontSize: 8, color: MUTED, marginBottom: 2 },
  th: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: GREEN, paddingBottom: 3, color: MUTED, fontSize: 8, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 4 },
  cDesc: { flex: 1, paddingRight: 6 },
  cQty: { width: 36, textAlign: "right" },
  cPrice: { width: 72, textAlign: "right" },
  cAmount: { width: 76, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: 220, marginTop: 8, marginBottom: 8 },
  tot: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1.5, borderTopColor: GREEN, paddingTop: 4, marginTop: 2, fontSize: 12, fontFamily: "Helvetica-Bold" },
  h: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  inst: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: LINE },
  sign: { flexDirection: "row", gap: 24, marginTop: 26 },
  signCol: { flex: 1 },
  signLine: { borderTopWidth: 0.7, borderTopColor: "#12261C", marginTop: 40, paddingTop: 2, fontSize: 8, color: MUTED },
});

export function DocumentPdf({ data }: { data: SheetData }) {
  const isBL = data.type === "BL";
  const label = DOCUMENT_LABELS[data.type];
  // @react-pdf ne lit que PNG et JPEG : un logo WebP est ignoré plutôt que de faire échouer le PDF.
  const logo = data.company.logo && /^data:image\/(png|jpeg);/.test(data.company.logo) ? data.company.logo : null;
  return (
    <Document title={`${label.singular} ${data.number}`} author={data.company.name} language="fr">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View style={{ maxWidth: 300 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- composant PDF, pas une balise HTML */}
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <Text style={s.company}>{data.company.name}</Text>
            {data.company.rccm ? <Text style={s.muted}>RCCM : {data.company.rccm}</Text> : null}
            {data.company.taxNumber ? <Text style={s.muted}>CC : {data.company.taxNumber}</Text> : null}
            {data.company.address ? <Text style={s.muted}>{data.company.address}</Text> : null}
            {data.company.phone ? <Text style={s.muted}>{formatPhone(data.company.phone)}</Text> : null}
          </View>
          <View style={s.right}>
            <Text style={s.title}>{label.upper}</Text>
            <Text style={s.bold}>{data.number}</Text>
            <Text style={s.muted}>Date : {formatDate(data.issueDate)}</Text>
            {data.dueDate && !isBL ? <Text style={s.muted}>Échéance : {formatDate(data.dueDate)}</Text> : null}
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.small}>{isBL ? "LIVRÉ À" : "CLIENT"}</Text>
          <Text style={s.bold}>{data.client.name}</Text>
          {data.client.phone ? <Text>{formatPhone(data.client.phone)}</Text> : null}
          {isBL && data.deliveryAddress ? <Text>{data.deliveryAddress}</Text> : !isBL && data.client.address ? <Text>{data.client.address}</Text> : null}
        </View>

        <View style={s.th}>
          <Text style={s.cDesc}>DÉSIGNATION</Text>
          <Text style={s.cQty}>QTÉ</Text>
          {!isBL ? <Text style={s.cPrice}>PRIX UNIT.</Text> : null}
          {!isBL ? <Text style={s.cAmount}>MONTANT</Text> : null}
        </View>
        {data.items.map((i, n) => (
          <View key={n} style={s.tr} wrap={false}>
            <Text style={s.cDesc}>{i.description}</Text>
            <Text style={s.cQty}>{i.quantity}</Text>
            {!isBL ? <Text style={s.cPrice}>{formatAmount(i.unitPrice)}</Text> : null}
            {!isBL ? <Text style={s.cAmount}>{formatAmount(Math.round(i.quantity * i.unitPrice))}</Text> : null}
          </View>
        ))}

        {!isBL ? (
          <>
            <View style={s.totals}>
              {data.discountAmount > 0 || data.vatAmount > 0 ? (
                <View style={s.tot}>
                  <Text>Sous-total</Text>
                  <Text>{formatFCFA(data.subtotal)}</Text>
                </View>
              ) : null}
              {data.discountAmount > 0 ? (
                <View style={s.tot}>
                  <Text>Remise ({data.discountPercent} %)</Text>
                  <Text>- {formatFCFA(data.discountAmount)}</Text>
                </View>
              ) : null}
              {data.vatPercent > 0 ? (
                <View style={s.tot}>
                  <Text>TVA ({data.vatPercent} %)</Text>
                  <Text>{formatFCFA(data.vatAmount)}</Text>
                </View>
              ) : null}
              <View style={s.grand}>
                <Text>Total</Text>
                <Text>{formatFCFA(data.total)}</Text>
              </View>
            </View>
            <Text style={{ fontFamily: "Helvetica-Oblique", marginBottom: 10 }}>{amountSentence(data.total)}</Text>

            {data.installments.length > 1 ? (
              <View style={{ marginBottom: 10 }} wrap={false}>
                <Text style={s.h}>Paiement en tranches</Text>
                {data.installments.map((t, n) => (
                  <View key={n} style={s.inst}>
                    <Text>
                      {t.label}
                      {t.dueDate ? ` - avant le ${formatDate(t.dueDate)}` : ""}
                    </Text>
                    <Text style={s.bold}>
                      {formatFCFA(t.amount)}
                      {t.paidAt ? "  (payée)" : ""}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data.paymentLines.length > 0 ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={s.h}>Moyens de paiement acceptés</Text>
                <Text>{data.paymentLines.join("  ·  ")}</Text>
              </View>
            ) : null}
          </>
        ) : null}

        {data.note ? <Text style={[s.muted, { marginBottom: 8 }]}>{data.note}</Text> : null}

        <View style={s.sign} wrap={false}>
          <View style={s.signCol}>
            <Text style={s.bold}>{isBL ? "Le livreur" : "Le prestataire"}</Text>
            <Text style={s.signLine}>{isBL && data.deliveredBy ? data.deliveredBy : "Signature"}</Text>
          </View>
          <View style={s.signCol}>
            <Text style={s.bold}>{isBL ? "Reçu par (nom, date, signature)" : "Cachet et signature du client"}</Text>
            <Text style={s.signLine}> </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderDocumentPdf(data: SheetData): Promise<Buffer> {
  return renderToBuffer(<DocumentPdf data={data} />);
}

export function pdfFilename(data: SheetData): string {
  return `${data.number}.pdf`;
}
