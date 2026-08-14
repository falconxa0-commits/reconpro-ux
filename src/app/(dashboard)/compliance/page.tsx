import type { Metadata } from "next";
import { CompliancePanel } from "@/components/reconpro/compliance-panel";

export const metadata: Metadata = {
  title: "Compliance",
};

export default function CompliancePage() {
  return <CompliancePanel />;
}
