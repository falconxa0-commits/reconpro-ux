import type { Metadata } from "next";
import PricingClient from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing | ReconPro",
  description:
    "Simple, transparent pricing. Free open-source tier, Pro plan with priority support, and Enterprise with dedicated infrastructure.",
};

export default function PricingPage() {
  return <PricingClient />;
}
