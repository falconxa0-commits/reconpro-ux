"use client";

import dynamic from "next/dynamic";
import { ScrollProgress } from "@/components/reconpro/ScrollProgress";
import { BackToTop } from "@/components/reconpro/BackToTop";
import { ObsidianShader } from "@/components/backgrounds/ObsidianShader";
import HeroSection from "@/components/reconpro/HeroSection";
import { FeaturesSection } from "@/components/reconpro/FeaturesSection";

// ── Dynamic imports: ambient overlays ──
const OLEDParticles = dynamic(
  () => import("@/components/reconpro/OLEDParticles").then((m) => m.OLEDParticles),
  { ssr: false }
);
const AuroraBackground = dynamic(
  () => import("@/components/reconpro/AuroraBackground").then((m) => m.AuroraBackground),
  { ssr: false }
);
const NeuralNetwork = dynamic(
  () => import("@/components/reconpro/NeuralNetwork").then((m) => m.NeuralNetwork),
  { ssr: false }
);
const DataStreams = dynamic(
  () => import("@/components/reconpro/DataStreams").then((m) => m.DataStreams),
  { ssr: false }
);
const CommandPalette = dynamic(
  () => import("@/components/reconpro/CommandPalette").then((m) => m.CommandPalette),
  { ssr: false }
);

// Below-fold sections
const ArchitectureSection = dynamic(
  () => import("@/components/reconpro/ArchitectureSection"),
  { ssr: false }
);
const ModulesSection = dynamic(
  () => import("@/components/reconpro/ModulesSection").then((m) => m.ModulesSection),
  { ssr: false }
);
const CLISection = dynamic(
  () => import("@/components/reconpro/CLISection"),
  { ssr: false }
);
const DocsSection = dynamic(
  () => import("@/components/reconpro/DocsSection"),
  { ssr: false }
);
const BenchmarksSection = dynamic(
  () => import("@/components/reconpro/BenchmarksSection"),
  { ssr: false }
);
const PricingSection = dynamic(
  () => import("@/components/reconpro/PricingSection").then((m) => m.PricingSection),
  { ssr: false }
);
const EnterpriseSection = dynamic(
  () => import("@/components/reconpro/EnterpriseSection").then((m) => m.EnterpriseSection),
  { ssr: false }
);
const FAQSection = dynamic(
  () => import("@/components/reconpro/FAQSection").then((m) => m.FAQSection),
  { ssr: false }
);
const CommunitySection = dynamic(
  () => import("@/components/reconpro/CommunitySection"),
  { ssr: false }
);

export function HomeSection() {
  return (
    <div className="min-h-screen bg-black">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-white/10 focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline-none focus:ring-2 focus:ring-white/50">
        Skip to main content
      </a>

      {/* WebGL Obsidian Shader — premium cinematic background */}
      <ObsidianShader
        active={true}
        speed={1}
        opacity={1}
        intensity={0.9}
        glow={1.0}
        zIndex={-1}
      />

      {/* Global ambient overlays */}
      <AuroraBackground />
      <NeuralNetwork />
      <OLEDParticles />
      <DataStreams />
      <ScrollProgress />
      <BackToTop />
      <CommandPalette />
      <div id="main-content">
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
        <PricingSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <EnterpriseSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <FAQSection />
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <CommunitySection />
      </div>
    </div>
  );
}
