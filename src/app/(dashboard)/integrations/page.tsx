import type { Metadata } from "next";
import { IntegrationHub } from "@/components/reconpro/integration-hub";

export const metadata: Metadata = {
  title: "Integrations",
};

export default function IntegrationsPage() {
  return <IntegrationHub />;
}
