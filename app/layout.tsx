import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coupe du Monde 2026 — Tableau final interactif",
  description:
    "Le bracket radial de la Coupe du Monde 2026, mis à jour en direct : scores, buteurs, cartons, remplacements.",
  openGraph: {
    title: "Coupe du Monde 2026 — Tableau final interactif",
    description:
      "Le tableau final sous forme de bracket radial, mis à jour avec les résultats réels du tournoi.",
    images: ["/og.png"],
    type: "website",
    locale: "fr_FR",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
