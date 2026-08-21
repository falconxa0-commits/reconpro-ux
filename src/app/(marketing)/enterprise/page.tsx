import type { Metadata } from "next";
import EnterpriseClient from "./enterprise-client";

export const metadata: Metadata = {
  title: "Enterprise | ReconPro",
  description:
    "ReconPro enterprise features: SSO, audit logging, compliance frameworks, dedicated infrastructure, and on-premise deployment.",
};

export default function EnterprisePage() {
  return <EnterpriseClient />;
}
