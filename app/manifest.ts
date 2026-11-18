import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FactureCI",
    short_name: "FactureCI",
    description: "Factures, devis et bons de livraison en FCFA, depuis votre téléphone.",
    lang: "fr",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F8F4",
    theme_color: "#0E6B43",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nouvelle facture", url: "/app/documents/nouveau?type=FAC" },
      { name: "Mes documents", url: "/app/documents" },
    ],
  };
}
