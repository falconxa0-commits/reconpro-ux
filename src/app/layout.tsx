import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReconPro — Enterprise Attack Surface Management",
  description: "Billion-dollar grade attack surface management platform. 13-category reconnaissance, real-time threat intelligence, compliance frameworks, continuous monitoring, and team collaboration for enterprise security operations.",
  keywords: ["cybersecurity", "attack surface management", "ASM", "reconnaissance", "vulnerability scanner", "enterprise security", "SOC2 compliance", "threat intelligence"],
  authors: [{ name: "ReconPro Security" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "ReconPro — Enterprise Attack Surface Management",
    description: "Enterprise-grade ASM with real-time threat intelligence, 13-category scanning, and continuous monitoring.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          backgroundColor: '#030407',
          color: '#f1f5f9',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
