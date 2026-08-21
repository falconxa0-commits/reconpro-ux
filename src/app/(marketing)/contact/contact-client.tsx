"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import {
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Building2,
  MessageSquare,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const subjectOptions = [
  "General Inquiry",
  "Enterprise Sales",
  "Technical Support",
  "Security Vulnerability Report",
  "Partnership",
  "Feature Request",
  "Billing",
];

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/50 font-medium">
      {children}
    </span>
  );
}

export default function ContactClient() {
  const { ref: formRef, isInView: formInView } = useInView(0.05);
  const { ref: infoRef, isInView: infoInView } = useInView(0.05);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const updateField = (field: string, value: string) => {
    setFormData((d) => ({ ...d, [field]: value }));
  };

  return (
    <div className="pt-16 bg-black">
      {/* Header */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
            className="text-center"
          >
            <SectionBadge>
              <MessageSquare width={12} height={12} className="text-[#00ff88]" />
              Contact
            </SectionBadge>
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-6 mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Get in touch
            </h1>
            <p
              className="text-base text-white/50 max-w-xl mx-auto"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Questions, enterprise inquiries, or security vulnerability reports.
              We read every message and respond within 24 hours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form + Info */}
      <section ref={formRef} className="relative pb-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Contact Form */}
            <motion.div
              initial="hidden"
              animate={formInView ? "visible" : "hidden"}
              variants={fadeUp}
              custom={0}
              className="lg:col-span-3"
            >
              <div className="panel p-6 sm:p-8">
                <h2
                  className="text-lg font-semibold text-white mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Send us a message
                </h2>

                {submitted ? (
                  <div className="py-12 text-center">
                    <CheckCircle2 className="w-10 h-10 text-[#00ff88] mx-auto mb-4" />
                    <h3
                      className="text-lg font-semibold text-white mb-2"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Message Sent
                    </h3>
                    <p
                      className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Thank you for reaching out. We will get back to you within
                      24 hours at the email address you provided.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="block text-xs font-medium text-white/50 mb-2"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          Name <span className="text-[#ff3355]">*</span>
                        </label>
                        <input
                          type="text"
                          id="contact-name"
                          required
                          value={formData.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          className="input-void w-full"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-xs font-medium text-white/50 mb-2"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          Email <span className="text-[#ff3355]">*</span>
                        </label>
                        <input
                          type="email"
                          id="contact-email"
                          required
                          value={formData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          className="input-void w-full"
                          placeholder="you@company.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="contact-company"
                          className="block text-xs font-medium text-white/50 mb-2"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          Company
                        </label>
                        <input
                          type="text"
                          id="contact-company"
                          value={formData.company}
                          onChange={(e) => updateField("company", e.target.value)}
                          className="input-void w-full"
                          placeholder="Your company (optional)"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="contact-subject"
                          className="block text-xs font-medium text-white/50 mb-2"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          Subject <span className="text-[#ff3355]">*</span>
                        </label>
                        <select
                          id="contact-subject"
                          required
                          value={formData.subject}
                          onChange={(e) => updateField("subject", e.target.value)}
                          className="input-void w-full appearance-none cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 14px center",
                          }}
                        >
                          <option value="" disabled>
                            Select a subject
                          </option>
                          {subjectOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-message"
                        className="block text-xs font-medium text-white/50 mb-2"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        Message <span className="text-[#ff3355]">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => updateField("message", e.target.value)}
                        className="input-void w-full resize-none"
                        placeholder="Describe your question, issue, or inquiry..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-all duration-300"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <Send className="w-4 h-4" />
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Office Card + Info */}
            <motion.div
              ref={infoRef}
              initial="hidden"
              animate={infoInView ? "visible" : "hidden"}
              variants={fadeUp}
              custom={1}
              className="lg:col-span-2 space-y-5"
            >
              {/* Office Card */}
              <div className="panel p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white/60" />
                  </div>
                  <h3
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Office
                  </h3>
                </div>
                <p
                  className="text-sm text-white/60 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <MapPin className="w-3 h-3 inline mr-1 text-white/30" />
                  548 Market St, Suite 36879
                  <br />
                  San Francisco, CA 94104
                </p>
              </div>

              {/* Support Email */}
              <div className="panel p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#00ff88]/[0.06] border border-[#00ff88]/[0.12] flex items-center justify-center">
                    <Mail className="w-4 h-4 text-[#00ff88]" />
                  </div>
                  <h3
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Support Email
                  </h3>
                </div>
                <a
                  href="mailto:support@reconpro.dev"
                  className="text-sm text-[#00ff88]/80 hover:text-[#00ff88] transition-colors font-mono"
                >
                  support@reconpro.dev
                </a>
                <p
                  className="text-xs text-white/30 mt-1"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  General inquiries and enterprise sales
                </p>
              </div>

              {/* Response Time */}
              <div className="panel p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white/60" />
                  </div>
                  <h3
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Response Time
                  </h3>
                </div>
                <p
                  className="text-sm text-white/50 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  We respond to all inquiries within{" "}
                  <span className="text-white font-medium">24 hours</span>{" "}
                  during business days. Security vulnerability reports are
                  acknowledged within 48 hours.
                </p>
              </div>

              {/* Security Reports */}
              <div className="panel p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#ff3355]/[0.06] border border-[#ff3355]/[0.12] flex items-center justify-center">
                    <Mail className="w-4 h-4 text-[#ff3355]" />
                  </div>
                  <h3
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Security Reports
                  </h3>
                </div>
                <a
                  href="mailto:security@reconpro.dev"
                  className="text-sm text-[#ff3355]/80 hover:text-[#ff3355] transition-colors font-mono"
                >
                  security@reconpro.dev
                </a>
                <p
                  className="text-xs text-white/30 mt-1"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Vulnerability disclosure and security concerns
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
