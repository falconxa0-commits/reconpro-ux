import type { Metadata } from "next";
import AboutClient from "./about-client";

export const metadata: Metadata = {
  title: "About | ReconPro",
  description:
    "ReconPro is an open-source attack surface intelligence platform. Learn about our mission, values, team, and technology stack.",
};

export default function AboutPage() {
  return <AboutClient />;
}
