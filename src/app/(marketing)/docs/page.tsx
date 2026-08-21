import type { Metadata } from "next";
import DocsClient from "./docs-client";

export const metadata: Metadata = {
  title: "Documentation | ReconPro",
  description:
    "ReconPro documentation hub. Getting started guides, API reference, CLI commands, integrations, and architecture docs.",
};

export default function DocsPage() {
  return <DocsClient />;
}
