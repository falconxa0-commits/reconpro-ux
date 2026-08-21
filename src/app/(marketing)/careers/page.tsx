import type { Metadata } from "next";
import CareersClient from "./careers-client";

export const metadata: Metadata = {
  title: "Careers | ReconPro",
  description:
    "Join the ReconPro team — open roles in security engineering, backend development, product design, and DevOps.",
};

export default function CareersPage() {
  return <CareersClient />;
}
