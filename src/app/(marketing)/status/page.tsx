import type { Metadata } from "next";
import StatusClient from "./status-client";

export const metadata: Metadata = {
  title: "Status | ReconPro",
  description:
    "ReconPro system status — real-time uptime and latency for all platform components.",
};

export default function StatusPage() {
  return <StatusClient />;
}
