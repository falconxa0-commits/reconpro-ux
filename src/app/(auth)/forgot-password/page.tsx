"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cooldown]);

  const sendResetEmail = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setError("");
      setResendLoading(true);
      setLoading(sent ? false : loading);

      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Something went wrong.");
        }
        setSent(true);
        setCooldown(COOLDOWN_SECONDS);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
        setErrorKey((k) => k + 1);
      } finally {
        setResendLoading(false);
      }
    },
    [email, sent, loading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      setErrorKey((k) => k + 1);
      return;
    }
    setLoading(true);
    sendResetEmail();
    setLoading(false);
  };

  const handleResend = () => {
    if (cooldown > 0 || resendLoading) return;
    sendResetEmail();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        /* ── Success state ──────────────────────────────────────────── */
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] text-white"
        >
          <div className="text-center pt-10 pb-2 px-6">
            {/* Animated checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.15,
              }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00ff88]/10"
            >
              <CheckCircle2 className="h-8 w-8 text-[#00ff88]" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Check your email
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[13px] text-[#555555] mt-2 max-w-[280px] mx-auto leading-relaxed"
            >
              If an account exists with{" "}
              <span className="text-white/80 font-medium">{email}</span>,
              you&apos;ll receive a password reset link shortly.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="px-6 pb-8 space-y-4"
          >
            {/* Info box */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[12px] text-white/40 leading-relaxed">
                Password reset links are sent when the email delivery service
                is configured. Check your spam folder if you don&apos;t see
                the email.
              </p>
            </div>

            {/* Resend button with cooldown */}
            <Button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resendLoading}
              variant="outline"
              className="w-full border-white/[0.08] bg-white/[0.03] text-[#999999] hover:bg-white/[0.06] hover:text-white rounded-lg h-10 text-[13px]"
            >
              {resendLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : cooldown > 0 ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend in {formatTime(cooldown)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend email
                </span>
              )}
            </Button>

            {/* Back to login */}
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-[13px] text-[#666666] hover:text-white transition-colors py-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </motion.div>
        </motion.div>
      ) : (
        /* ── Email input state ───────────────────────────────────────── */
        <motion.div
          key="form"
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] text-white"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center pt-10 pb-2 px-6"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.06]">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Forgot Password
            </h2>
            <p className="text-[13px] text-[#555555] mt-1.5">
              Enter your email to receive a reset link
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-6 pb-8"
          >
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key={`err-${errorKey}`}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="mb-4 rounded-lg border border-[#ff3355]/25 bg-[#ff3355]/[0.05] px-4 py-3 text-[13px] text-[#ff3355]"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-[#888888] text-xs"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444444]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 bg-white/[0.03] border-white/[0.06] pl-10 text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
                  />
                </div>
                <p className="text-[11px] text-[#444444]">
                  We&apos;ll send a password reset link to your email address.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-white/90 font-medium rounded-lg h-10 text-[13px]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <div className="text-center pt-5">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[12px] text-[#555555] hover:text-[#999999] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
