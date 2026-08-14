import type { Metadata } from "next";
import { TeamManagement } from "@/components/reconpro/team-management";

export const metadata: Metadata = {
  title: "Teams",
};

export default function TeamsPage() {
  return <TeamManagement />;
}
