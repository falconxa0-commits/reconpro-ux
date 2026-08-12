"use client";

import { Navbar } from "@/components/reconpro/Navbar";
import { Footer } from "@/components/reconpro/Footer";
import HeroSection from "@/components/reconpro/HeroSection";
import { FeaturesSection } from "@/components/reconpro/FeaturesSection";
import ArchitectureSection from "@/components/reconpro/ArchitectureSection";
import { ModulesSection } from "@/components/reconpro/ModulesSection";
import CLISection from "@/components/reconpro/CLISection";
import DocsSection from "@/components/reconpro/DocsSection";
import BenchmarksSection from "@/components/reconpro/BenchmarksSection";
import EnterpriseSection from "@/components/reconpro/EnterpriseSection";
import CommunitySection from "@/components/reconpro/CommunitySection";

export function HomeSection() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main>
        <HeroSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <FeaturesSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <ArchitectureSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <ModulesSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <CLISection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <DocsSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <BenchmarksSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <EnterpriseSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <CommunitySection />
      </main>
      <Footer />
    </div>
  );
}
