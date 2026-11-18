import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-bricolage", display: "swap" });

export const metadata: Metadata = {
  title: { default: "FactureCI – Votre facture en 30 secondes", template: "%s · FactureCI" },
  description: "Factures, devis et bons de livraison en FCFA, depuis votre téléphone. Envoi sur WhatsApp, paiement en tranches.",
  applicationName: "FactureCI",
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "FactureCI", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F8F4" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1712" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={bricolage.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
