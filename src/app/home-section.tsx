"use client";

import { Navbar } from "@/components/reconpro/Navbar";
import { Footer } from "@/components/reconpro/Footer";
import { OLEDParticles } from "@/components/reconpro/OLEDParticles";
import { AuroraBackground } from "@/components/reconpro/AuroraBackground";
import { NeuralNetwork } from "@/components/reconpro/NeuralNetwork";
import { DataStreams } from "@/components/reconpro/DataStreams";
import { ScrollProgress } from "@/components/reconpro/ScrollProgress";
import { BackToTop } from "@/components/reconpro/BackToTop";
import { CommandPalette } from "@/components/reconpro/CommandPalette";
import { ObsidianShader } from "@/components/backgrounds/ObsidianShader";
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

      {/* Premium ambient overlays */}
      <div className="bloom-overlay" aria-hidden="true" />
      <div className="scroll-light" aria-hidden="true" />
      <div className="ambient-aurora" aria-hidden="true" />

      {/* Global ambient overlays */}
      <AuroraBackground />
      <NeuralNetwork />
      <OLEDParticles />
      <DataStreams />
      <ScrollProgress />
      <BackToTop />
      <CommandPalette />
      <Navbar />
      <main id="main-content">
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
