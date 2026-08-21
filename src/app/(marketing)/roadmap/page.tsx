import type { Metadata } from "next";
import RoadmapClient from "./roadmap-client";

export const metadata: Metadata = {
  title: "Roadmap | ReconPro",
  description:
    "ReconPro product roadmap — quarterly feature releases, current progress, and planned capabilities.",
};

export default function RoadmapPage() {
  return <RoadmapClient />;
}
