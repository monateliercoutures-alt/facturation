import { Document, Image, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { deriveSheet, type SheetData } from "@/lib/documents/sheet";
import { amountSentence } from "@/lib/documents/words";
import { formatAmount, formatDate, formatFCFA } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

const GREEN = "#0E6B43";
const MUTED = "#5B6B62";
const LINE = "#D9E2DB";
const SOFT = "#F5F8F4";

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingHorizontal: 36, paddingBottom: 64, fontSize: 9.5, fontFamily: "Helvetica", color: "#12261C" },
  head: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 12, marginBottom: 12, borderBottomWidth: 2.5, borderBottomColor: GREEN },
  logo: { maxHeight: 44, maxWidth: 140, marginBottom: 4, objectFit: "contain" },
  company: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  muted: { color: MUTED },
  right: { textAlign: "right" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GREEN, marginBottom: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  parties: { flexDirection: "row", gap: 10, marginBottom: 10 },
  box: { flex: 1, backgroundColor: SOFT, padding: 8, borderRadius: 6 },
  small: { fontSize: 7.5, color: MUTED, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  th: { flexDirection: "row", backgroundColor: GREEN, color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 5, paddingHorizontal: 4 },
  tr: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4 },
  zebra: { backgroundColor: SOFT },
  cDesc: { flex: 1, paddingRight: 6 },
  cQty: { width: 56, textAlign: "right" },
  cUnit: { width: 44, paddingLeft: 6 },
  cPrice: { width: 70, textAlign: "right" },
  cAmount: { width: 76, textAlign: "right" },
  cObs: { width: 120, paddingLeft: 6 },
  totals: { alignSelf: "flex-end", width: 230, marginTop: 8, marginBottom: 8 },
  tot: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  grand: { flexDirection: "row", justifyContent: "space-between", backgroundColor: GREEN, color: "#fff", paddingVertical: 4, paddingHorizontal: 6, marginVertical: 2, borderRadius: 4, fontSize: 11, fontFamily: "Helvetica-Bold" },
  h: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  inst: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: LINE },
  sign: { flexDirection: "row", gap: 10, marginTop: 18 },
  signBox: { flex: 1, backgroundColor: SOFT, padding: 8, borderRadius: 6, minHeight: 78 },
  signLine: { borderTopWidth: 0.7, borderTopColor: "#12261C", marginTop: 38, paddingTop: 2, fontSize: 7.5, color: MUTED },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, borderTopWidth: 0.7, borderTopColor: LINE, paddingTop: 5, textAlign: "center", fontSize: 7.5, color: MUTED },
});

export function DocumentPdf({ data }: { data: SheetData }) {
  const d = deriveSheet(data);
  const { traits, isBL } = d;
  // @react-pdf ne lit que PNG et JPEG : un logo WebP est ignoré plutôt que de faire échouer le PDF.
  const logo = data.company.logo && /^data:image\/(png|jpeg);/.test(data.company.logo) ? data.company.logo : null;
  const shipTo = isBL ? (data.deliveryAddress ?? data.client.address) : data.deliveryAddress;
  return (
    <Document title={`${traits.singular} ${data.number}`} author={data.company.name} language="fr">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View style={{ maxWidth: 300 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- composant PDF, pas une balise HTML */}
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <Text style={s.company}>{data.company.name}</Text>
            {data.company.tagline ? <Text style={[s.muted, { fontFamily: "Helvetica-Oblique" }]}>{data.company.tagline}</Text> : null}
            {data.company.address ? <Text style={s.muted}>{data.company.address}</Text> : null}
            {d.contact.length ? <Text style={s.muted}>{d.contact.join("  ·  ")}</Text> : null}
            {d.identity.length ? <Text style={s.muted}>{d.identity.join("  ·  ")}</Text> : null}
          </View>
          <View style={s.right}>
            <Text style={s.title}>{traits.upper}</Text>
            <Text style={[s.bold, { fontSize: 11 }]}>N° {data.number}</Text>
            <Text style={s.muted}>Date : {formatDate(data.issueDate)}</Text>
            {data.dueDate ? <Text style={s.bold}>{traits.dueLabel} : {formatDate(data.dueDate)}</Text> : null}
            {data.clientReference ? <Text style={s.muted}>Réf. : {data.clientReference}</Text> : null}
          </View>
        </View>

        <View style={s.parties} wrap={false}>
          <View style={s.box}>
            <Text style={s.small}>{traits.party.toUpperCase()}</Text>
            <Text style={s.bold}>{data.client.name}</Text>
            {isBL ? (shipTo ? <Text>{shipTo}</Text> : null) : data.client.address ? <Text>{data.client.address}</Text> : null}
            {data.client.phone ? <Text>{formatPhone(data.client.phone)}</Text> : null}
            {data.client.email ? <Text>{data.client.email}</Text> : null}
          </View>
          {d.showShipTo ? (
            <View style={s.box}>
              <Text style={s.small}>LIVRAISON</Text>
              <Text>{data.deliveryAddress}</Text>
            </View>
          ) : null}
        </View>

        {data.subject ? (
          <Text style={{ marginBottom: 8 }}>
            <Text style={s.bold}>Objet : </Text>
            {data.subject}
          </Text>
        ) : null}

        <View style={s.th} fixed>
          <Text style={s.cDesc}>DÉSIGNATION</Text>
          <Text style={s.cQty}>{isBL ? "COMMANDÉ" : "QTÉ"}</Text>
          {isBL ? <Text style={s.cQty}>LIVRÉ</Text> : null}
          {d.showUnit ? <Text style={s.cUnit}>UNITÉ</Text> : null}
          {!isBL ? <Text style={s.cPrice}>PRIX UNIT.</Text> : null}
          {!isBL ? <Text style={s.cAmount}>MONTANT</Text> : null}
          {d.showObservations ? <Text style={s.cObs}>OBSERVATIONS</Text> : null}
        </View>
        {data.items.map((i, n) => (
          <View key={n} style={[s.tr, n % 2 ? s.zebra : {}]} wrap={false}>
            <Text style={s.cDesc}>{i.description}</Text>
            <Text style={s.cQty}>{i.quantity}</Text>
            {isBL ? <Text style={[s.cQty, s.bold]}>{i.quantityDelivered ?? i.quantity}</Text> : null}
            {d.showUnit ? <Text style={s.cUnit}>{i.unit ?? ""}</Text> : null}
            {!isBL ? <Text style={s.cPrice}>{formatAmount(i.unitPrice)}</Text> : null}
            {!isBL ? <Text style={[s.cAmount, s.bold]}>{formatAmount(Math.round(i.quantity * i.unitPrice))}</Text> : null}
            {d.showObservations ? <Text style={s.cObs}>{i.observation ?? ""}</Text> : null}
          </View>
        ))}

        {traits.priced ? (
          <>
            <View style={s.totals} wrap={false}>
              {data.discountAmount > 0 || d.hasVat ? (
                <View style={s.tot}>
                  <Text>{data.discountAmount > 0 ? "Sous-total" : "Total HT"}</Text>
                  <Text>{formatFCFA(data.subtotal)}</Text>
                </View>
              ) : null}
              {data.discountAmount > 0 ? (
                <View style={s.tot}>
                  <Text>Remise ({data.discountPercent} %)</Text>
                  <Text>- {formatFCFA(data.discountAmount)}</Text>
                </View>
              ) : null}
              {data.discountAmount > 0 && d.hasVat ? (
                <View style={s.tot}>
                  <Text>Total HT</Text>
                  <Text>{formatFCFA(d.netHt)}</Text>
                </View>
              ) : null}
              {d.hasVat ? (
                <View style={s.tot}>
                  <Text>TVA ({data.vatPercent} %)</Text>
                  <Text>{formatFCFA(data.vatAmount)}</Text>
                </View>
              ) : null}
              <View style={s.grand}>
                <Text>{d.totalLabel}</Text>
                <Text>{formatFCFA(data.total)}</Text>
              </View>
              {d.paid > 0 && d.paid < data.total ? (
                <>
                  <View style={s.tot}>
                    <Text>Déjà réglé</Text>
                    <Text>- {formatFCFA(d.paid)}</Text>
                  </View>
                  <View style={[s.tot, s.bold]}>
                    <Text>Reste à payer</Text>
                    <Text>{formatFCFA(d.remaining)}</Text>
                  </View>
                </>
              ) : null}
            </View>
            <Text style={{ fontFamily: "Helvetica-Oblique", marginBottom: 10 }}>{amountSentence(data.total)}</Text>

            {data.installments.length > 1 ? (
              <View style={{ marginBottom: 10 }} wrap={false}>
                <Text style={s.h}>Conditions de règlement</Text>
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
              <View style={{ marginBottom: 10 }} wrap={false}>
                <Text style={s.h}>Moyens de paiement acceptés</Text>
                <Text>{data.paymentLines.join("  ·  ")}</Text>
                {d.bankVisible ? (
                  <Text style={{ marginTop: 3 }}>
                    <Text style={s.bold}>Coordonnées bancaires : </Text>
                    {data.company.bankDetails}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {data.note ? <Text style={[s.muted, { marginBottom: 8 }]}>{data.note}</Text> : null}

        <View style={s.sign} wrap={false}>
          <View style={s.signBox}>
            <Text style={[s.bold, { fontSize: 8 }]}>{traits.signLeft}</Text>
            <Text style={s.signLine}>{isBL && data.deliveredBy ? data.deliveredBy : "Signature"}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={[s.bold, { fontSize: 8 }]}>{traits.signRight}</Text>
            <Text style={s.signLine}>Date et signature</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          {traits.priced ? <Text style={[s.bold, { color: "#12261C", marginBottom: 2 }]}>Merci de votre confiance.{d.contact.length ? ` Une question sur ce document ? ${d.contact.slice(0, 2).join("  ·  ")}` : ""}</Text> : null}
          <Text>{[data.company.name, ...d.identity].join("  ·  ")}</Text>
        </View>
        <Text fixed style={{ position: "absolute", bottom: 8, left: 36, right: 36, textAlign: "center", fontSize: 7.5, color: MUTED }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
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
