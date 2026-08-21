import type { Metadata } from "next";
import TrustClient from "./trust-client";

export const metadata: Metadata = {
  title: "Trust Center | ReconPro",
  description:
    "ReconPro trust center — security infrastructure, compliance certifications, audit reports, and responsible disclosure.",
};

export default function TrustCenterPage() {
  return <TrustClient />;
}
