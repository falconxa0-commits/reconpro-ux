import type { Metadata } from "next";
import ApiOverviewClient from "./api-overview-client";

export const metadata: Metadata = {
  title: "API Overview | ReconPro",
  description:
    "ReconPro REST API documentation. Authentication, endpoint categories, rate limits, and example requests.",
};

export default function ApiOverviewPage() {
  return <ApiOverviewClient />;
}
