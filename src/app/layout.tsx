import { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { HomeSection } from "./home-section";
import { JsonLdStructuredData } from "@/components/seo/json-ld";

// ── Premium Font System — ReconPro ──
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

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
  authors: [{ name: "ReconPro" }],
  creator: "ReconPro",
  publisher: "ReconPro",
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
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
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