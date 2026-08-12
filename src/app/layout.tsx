import { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { HomeSection } from "./home-section";
import { JsonLdStructuredData } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  metadataBase: new URL("https://reconpro.dev"),
  title: {
    default: "ReconPro — Attack Surface Intelligence Platform",
    template: "%s | ReconPro",
  },
  applicationName: "ReconPro",
  description: "Autonomous attack surface intelligence. 16 scanner modules, 45 CLI commands, 3 dependencies. Real-time threat intel, knowledge graph, and executive reporting.",
  keywords: [
    "reconpro", "attack surface management", "security scanner", "reconnaissance",
    "vulnerability assessment", "pentesting", "cybersecurity", "threat intelligence",
    "open source", "python", "ASM", "knowledge graph", "evidence correlation",
    "compliance mapping", "executive reporting", "CVE detection", "subdomain enumeration",
    "port scanning", "SSL analysis", "CT logs",
  ],
  authors: [{ name: "ReconPro", url: "https://github.com/reconpro" }],
  creator: "ReconPro",
  publisher: "ReconPro",
  category: "security",
  version: "10.0.0",
  alternates: {
    canonical: "https://reconpro.dev",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "ReconPro — Attack Surface Intelligence Platform",
    description: "Autonomous reconnaissance. 16 modules. 45 commands. 3 dependencies. Zero compromises.",
    type: "website",
    siteName: "ReconPro",
    locale: "en_US",
    url: "https://reconpro.dev",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ReconPro — Attack Surface Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReconPro — Attack Surface Intelligence Platform",
    description: "Autonomous reconnaissance. 16 modules. 45 commands. 3 dependencies.",
    images: ["/og-image.png"],
    creator: "@reconpro",
    site: "@reconpro",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/logo.svg",
  },
  other: {
    "theme-color": "#000000",
    "color-scheme": "dark",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Premium Font System — ReconPro v10.0.0 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* SEO: JSON-LD Structured Data */}
        <JsonLdStructuredData />
      </head>
      <body className="antialiased bg-black text-white">
        {children}
        <Toaster />
      </body>
    </html>
  );
}