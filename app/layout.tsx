import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup 2026 — Interactive Final Bracket",
  description:
    "The World Cup 2026 radial bracket, updated live: scores, scorers, cards, substitutions.",
  openGraph: {
    title: "World Cup 2026 — Interactive Final Bracket",
    description:
      "The final bracket as a radial diagram, updated with the tournament's real results.",
    images: ["/og.png"],
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
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
