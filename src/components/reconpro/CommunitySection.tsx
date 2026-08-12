"use client";

import { useRef } from "react";
import { GitBranch, Code, Users, Shield, Unlock, Package, FlaskConical, GitPullRequest, Eye } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const stats = [
  "18.7K GitHub Stars",
  "142 Contributors",
  "2.4M+ PyPI Downloads",
  "MIT License",
];

const guideCards = [
  {
    icon: GitBranch,
    title: "Contributing",
    description: "PR template, code standards, review process, merge criteria",
    href: "#",
  },
  {
    icon: Code,
    title: "Development",
    description: "Setup guide, architecture overview, testing standards, release process",
    href: "#",
  },
  {
    icon: Users,
    title: "Community",
    description: "Discord server, GitHub Discussions, issue templates, governance",
    href: "#",
  },
];

const badges = [
  { icon: Shield, label: "MIT Licensed" },
  { icon: Unlock, label: "No Vendor Lock-in" },
  { icon: Package, label: "3 Dependencies" },
  { icon: FlaskConical, label: "533 Tests" },
  { icon: GitPullRequest, label: "142 Contributors" },
  { icon: Eye, label: "Transparent Development" },
];

export default function CommunitySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { threshold: 0.1 });

  return (
    <section
      id="community"
      ref={sectionRef}
      className="relative w-full bg-black py-32 px-6"
    >
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
        <div className="h-[600px] w-[800px] rounded-full bg-white/[0.02] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="mb-16 text-center">
          <h2
            className={`
              text-4xl font-medium tracking-tight text-white sm:text-5xl
              transition-all duration-700
              ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
            `}
          >
            Community
          </h2>
          <p
            className={`
              mt-4 max-w-xl mx-auto text-base text-white/40 transition-all delay-100 duration-700
              ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
            `}
          >
            Open source. Open community. Built together.
          </p>
        </div>

        {/* ── Stats Row ──────────────────────────────────── */}
        <div
          className={`
            mb-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4
            transition-all delay-150 duration-700
            ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
          `}
        >
          {stats.map((stat) => (
            <span
              key={stat}
              className="text-sm font-medium text-white/50"
            >
              {stat}
            </span>
          ))}
        </div>

        {/* ── Contribution Guide Cards ───────────────────── */}
        <div className="mb-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guideCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <a
                key={card.title}
                href={card.href}
                className={`
                  bento-tile glass-hover group relative overflow-hidden rounded-2xl
                  border border-white/[0.06] bg-white/[0.02] p-6
                  transition-all duration-700
                  ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
                `}
                style={{ transitionDelay: `${250 + i * 80}ms` }}
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent" />
                </div>

                <Icon className="mb-4 h-5 w-5 text-white/20" strokeWidth={1.5} />
                <h3 className="text-sm font-medium text-white">{card.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/30">
                  {card.description}
                </p>
                <span className="mt-4 inline-block text-xs text-white/20 transition-colors group-hover:text-white/50">
                  Learn more &rarr;
                </span>
              </a>
            );
          })}
        </div>

        {/* ── Open Source Badges ──────────────────────────── */}
        <div
          className={`
            flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:justify-center
            transition-all delay-[450ms] duration-700
            ${isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
          `}
        >
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <span
                key={badge.label}
                className="
                  flex shrink-0 items-center gap-2 rounded-full
                  border border-white/[0.06] bg-white/[0.02] px-4 py-2
                  text-xs font-medium text-white/40
                  backdrop-blur-xl
                "
              >
                <Icon className="h-3.5 w-3.5 text-white/25" strokeWidth={1.5} />
                {badge.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export { CommunitySection };
