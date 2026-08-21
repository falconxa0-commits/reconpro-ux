import type { Metadata } from "next";
import ChangelogClient from "./changelog-client";

export const metadata: Metadata = {
  title: "Changelog | ReconPro",
  description:
    "ReconPro changelog — version history, feature releases, and security updates.",
};

export default function ChangelogPage() {
  return <ChangelogClient />;
}
