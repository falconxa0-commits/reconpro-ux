import { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/reconpro/Navbar";
import { Footer } from "@/components/reconpro/Footer";
import { HomeSection } from "./home-section";

export const metadata: Metadata = {
  title: "ReconPro — Attack Surface Intelligence Platform",
  description:
    "Billion-dollar grade attack surface management. Autonomous reconnaissance, real-time threat intelligence, knowledge graph, evidence correlation, and executive reporting. 16 scanner modules. 45 CLI commands. 3 dependencies.",
  keywords: [
    "reconpro",
    "attack surface",
    "security scanner",
    "reconnaissance",
    "vulnerability assessment",
    "pentesting",
    "security tool",
    "open source",
    "python",
    "cybersecurity",
  ],
  openGraph: {
    title: "ReconPro — Attack Surface Intelligence Platform",
    description:
      "Autonomous reconnaissance. 16 modules. 45 commands. 3 dependencies. Zero compromises.",
    type: "website",
    siteName: "ReconPro",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReconPro — Attack Surface Intelligence Platform",
    description:
      "Autonomous reconnaissance. 16 modules. 45 commands. 3 dependencies.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-black text-white font-[family-name:var(--font-geist-sans)]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
