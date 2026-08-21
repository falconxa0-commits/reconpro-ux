"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  Lightbulb,
  Eye,
  Shield,
  Code2,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.1,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

const values = [
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We push the boundaries of reconnaissance technology. From our real-time DNS enumeration engine to AI-powered threat analysis, every feature is built to stay ahead of evolving attack surfaces.",
  },
  {
    icon: Eye,
    title: "Transparency",
    description:
      "Our codebase is fully open-source under the MIT license. Every security control, every limitation, and every trade-off is publicly documented. No hidden dependencies, no black boxes.",
  },
  {
    icon: Shield,
    title: "Security",
    description:
      "Security is not an afterthought — it is the foundation. AES-256 encryption at rest, TLS 1.3 in transit, SSRF protection, and strict CSP headers are baked into every layer of the platform.",
  },
];

const team = [
  { initials: "AK", name: "Alex Kowalski", role: "Founder & CTO", accent: true },
  { initials: "SR", name: "Sara Reyes", role: "Head of Security Research", accent: false },
  { initials: "JM", name: "James Mitchell", role: "Lead Engineer", accent: true },
  { initials: "LP", name: "Lena Park", role: "VP of Product", accent: false },
];

const techStack = [
  "Next.js 16",
  "React 19",
  "TypeScript 5",
  "Tailwind CSS 4",
  "Prisma ORM",
  "Framer Motion",
  "shadcn/ui",
  "SQLite",
  "Node.js",
  "Lucide Icons",
  "Radix UI",
  "Zustand",
];

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function AboutClient() {
  const { ref: storyRef, isInView: storyInView } = useInView(0.05);
  const { ref: valuesRef, isInView: valuesInView } = useInView(0.05);
  const { ref: teamRef, isInView: teamInView } = useInView(0.05);
  const { ref: techRef, isInView: techInView } = useInView(0.05);
  const { ref: ctaRef, isInView: ctaInView } = useInView(0.05);

  return (
    <div className="pt-16 bg-black">
      {/* Hero Header */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1] as const,
            }}
          >
            <SectionBadge>About Us</SectionBadge>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white mt-6 mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Building the future of{" "}
              <span className="text-gradient-void">
                attack surface intelligence
              </span>
            </h1>
            <p
              className="text-base sm:text-lg text-white/50 max-w-2xl leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              ReconPro was founded on a simple belief: security teams deserve
              tools that are fast, honest, and built with modern engineering
              standards. No marketing fluff. No inflated vulnerability counts.
              Just real reconnaissance capabilities.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission / Story */}
      <section ref={storyRef} className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={storyInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="panel p-6 sm:p-8"
          >
            <h2
              className="text-2xl font-semibold text-white mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Our Mission
            </h2>
            <div
              className="space-y-4 text-sm sm:text-base text-white/60 leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <p>
                Most reconnaissance frameworks are either abandoned open-source
                projects with hundreds of dependencies, or expensive SaaS
                platforms that lock you into proprietary data formats. We
                exist to change that.
              </p>
              <p>
                Our goal is straightforward: build a reconnaissance tool that is
                fast, dependency-light, and honest about what it does. The
                platform provides real-time reconnaissance, vulnerability
                scanning, threat detection, and compliance mapping — all with
                full source code transparency under the MIT License.
              </p>
              <p>
                From our DNS enumeration engine to our SSL/TLS analysis pipeline,
                every module is designed for production use by security teams who
                need reliable, actionable intelligence about their attack
                surface.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values — Innovation, Transparency, Security */}
      <section ref={valuesRef} className="relative py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={valuesInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Values</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              What drives us
            </h2>
            <p
              className="text-sm sm:text-base text-white/40 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Three principles that guide every decision we make.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial="hidden"
                animate={valuesInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i + 1}
                className="panel p-6 hover-glow metallic-sheen"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
                  <value.icon className="w-5 h-5 text-[#00ff88]" />
                </div>
                <h3
                  className="text-base font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {value.title}
                </h3>
                <p
                  className="text-sm text-white/50 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section ref={teamRef} className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={teamInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Team</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              The people behind ReconPro
            </h2>
            <p
              className="text-sm sm:text-base text-white/40 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              A focused team of security engineers and product builders.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial="hidden"
                animate={teamInView ? "visible" : "hidden"}
                variants={fadeUp}
                custom={i + 1}
                className="panel p-6 text-center hover-glow"
              >
                <div
                  className={`w-16 h-16 rounded-full ${
                    member.accent
                      ? "bg-[#00ff88]/10 text-[#00ff88]"
                      : "bg-white/[0.06] text-white/80"
                  } flex items-center justify-center mx-auto mb-4 text-lg font-bold`}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {member.initials}
                </div>
                <h3
                  className="text-sm font-semibold text-white mb-1"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {member.name}
                </h3>
                <p
                  className="text-xs text-white/40"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {member.role}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack Badges */}
      <section ref={techRef} className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={techInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <SectionBadge>Technology</SectionBadge>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Built with modern tools
            </h2>
            <p
              className="text-sm sm:text-base text-white/40 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Our stack prioritizes performance, developer experience, and
              security.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={techInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={1}
            className="panel p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <Code2 className="w-4 h-4 text-[#00ff88]" />
              <h3
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Core Stack
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/60 font-mono"
                >
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Join the Team CTA */}
      <section ref={ctaRef} className="relative py-20 pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={ctaInView ? "visible" : "hidden"}
            variants={fadeUp}
            custom={0}
            className="panel p-8 sm:p-12 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#00ff88]/[0.06] border border-[#00ff88]/[0.12] flex items-center justify-center mx-auto mb-6">
              <Users className="w-6 h-6 text-[#00ff88]" />
            </div>
            <h2
              className="text-2xl sm:text-3xl font-semibold text-white mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Join the team
            </h2>
            <p
              className="text-sm sm:text-base text-white/50 max-w-md mx-auto mb-8 leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              We are always looking for exceptional security engineers and
              developers who want to build something meaningful.
            </p>
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-all duration-300"
              style={{ fontFamily: "var(--font-body)" }}
            >
              View Open Positions
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
