import type { Metadata } from "next";
import SecurityClient from "./security-client";

export const metadata: Metadata = {
  title: "Security | ReconPro",
  description:
    "Security measures implemented in ReconPro: encryption, access control, monitoring, compliance, and vulnerability disclosure.",
};

export default function SecurityPage() {
  return <SecurityClient />;
}
