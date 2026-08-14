import type { Metadata } from "next";
import { Navbar } from "@/components/reconpro/Navbar";
import { Footer } from "@/components/reconpro/Footer";

export const metadata: Metadata = {
  title: "ReconPro",
  description: "Attack surface intelligence platform.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
