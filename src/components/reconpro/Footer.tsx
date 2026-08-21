"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Mail, Github, Twitter, MessageCircle } from "lucide-react";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Architecture", href: "/#architecture" },
      { label: "Scanner Modules", href: "/#modules" },
      { label: "CLI Reference", href: "/#cli" },
      { label: "API Overview", href: "/api-overview" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/api-overview" },
      { label: "Changelog", href: "/changelog" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "System Status", href: "/status" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Security", href: "/security" },
      { label: "Trust Center", href: "/trust" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "License (MIT)", href: "https://opensource.org/licenses/MIT" },
    ],
  },
];

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/reconpro",
    icon: Github,
  },
  {
    label: "Twitter / X",
    href: "https://x.com/reconpro",
    icon: Twitter,
  },
  {
    label: "Discord",
    href: "https://discord.gg/reconpro",
    icon: MessageCircle,
  },
];

export function Footer() {
  const { ref, isInView } = useInView(0.05);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    },
    [email]
  );

  return (
    <footer
      ref={ref}
      className="relative border-t border-white/[0.04] bg-black"
      aria-label="Site footer"
    >
      {/* Subscribe Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12"
      >
        <div className="max-w-xl mx-auto text-center mb-12">
          <h3
            className="text-lg font-semibold text-white mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Subscribe to updates
          </h3>
          <p className="text-sm text-white/50 mb-5" style={{ fontFamily: "var(--font-body)" }}>
            Get the latest security intelligence, product updates, and threat reports delivered to your inbox.
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <div className="relative flex-1">
              <Mail
                width={16}
                height={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                aria-hidden="true"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full h-10 pl-10 pr-4 text-sm text-white bg-white/[0.03] border border-white/[0.08] rounded-lg outline-none placeholder:text-white/30 focus:border-[#00ff88]/[0.3] transition-colors duration-300"
                style={{ fontFamily: "var(--font-body)" }}
                aria-label="Email address for newsletter"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-5 text-sm font-medium text-black bg-white rounded-lg hover:bg-white/90 transition-all duration-300 whitespace-nowrap"
            >
              {subscribed ? "Subscribed ✓" : "Subscribe"}
            </button>
          </form>
        </div>

        {/* Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-12" />

        {/* 4-Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4
                className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-neutral-500 hover:text-white transition-colors duration-300"
                        style={{ fontFamily: "var(--font-body)" }}
                        aria-label={`Open ${link.label} in new tab`}
                      >
                        {link.label}
                      </a>
                    ) : link.href.startsWith("/#") ? (
                      <button
                        onClick={() => {
                          const id = link.href.replace("/#", "");
                          const el = document.getElementById(id);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="text-sm text-neutral-500 hover:text-white transition-colors duration-300"
                        style={{ fontFamily: "var(--font-body)" }}
                        aria-label={`Navigate to ${link.label}`}
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-neutral-500 hover:text-white transition-colors duration-300"
                        style={{ fontFamily: "var(--font-body)" }}
                        aria-label={`Navigate to ${link.label}`}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo + Copyright */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00ff88"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-[11px] text-white/40" style={{ fontFamily: "var(--font-body)" }}>
            &copy; {new Date().getFullYear()} ReconPro. All rights reserved.
          </span>
        </div>

        {/* Status + Social Links */}
        <div className="flex items-center gap-5">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.04]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff88]" />
            </span>
            <span className="text-[10px] text-white/50 font-medium" style={{ fontFamily: "var(--font-body)" }}>
              All Systems Operational
            </span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-1">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300"
                aria-label={social.label}
              >
                <social.icon width={14} height={14} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
