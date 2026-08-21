"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Lock,
  UserPlus,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Github,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// GitHub icon SVG
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// Google icon SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// Password strength calculation
function getPasswordStrength(pw: string): {
  label: string;
  color: string;
  width: string;
} {
  if (pw.length === 0) return { label: "", color: "", width: "0%" };
  if (pw.length < 8)
    return { label: "Weak", color: "#ff3355", width: "33%" };
  if (pw.length < 12)
    return { label: "Fair", color: "#eab308", width: "66%" };
  return { label: "Strong", color: "#00ff88", width: "100%" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [
    successData,
    setSuccessData,
  ] = useState<{ api_key: string; org_id: string } | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  const pwStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessData(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      setErrorKey((k) => k + 1);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      setErrorKey((k) => k + 1);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setErrorKey((k) => k + 1);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setErrorKey((k) => k + 1);
      return;
    }
    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service.");
      setErrorKey((k) => k + 1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || `Registration failed (HTTP ${res.status})`
        );
      }

      if (data.api_key) {
        localStorage.setItem("reconpro_api_key", data.api_key);
      }
      setSuccessData({ api_key: data.api_key, org_id: data.org_id });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Registration failed."
      );
      setErrorKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  // ── Success state: show API key once ─────────────────────────────
  if (successData) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-lg border border-white/[0.06] bg-white/[0.03] text-white"
      >
        <div className="text-center pt-8 pb-2 px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.15,
            }}
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#00ff88]/10"
          >
            <CheckCircle2 className="h-7 w-7 text-[#00ff88]" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Account Created
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-[13px] text-[#555555] mt-1.5"
          >
            Save your API key — it will not be shown again
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="px-6 pb-6 space-y-4"
        >
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-white/50 shrink-0 mt-0.5" />
              <div className="text-sm text-white/50">
                <p className="font-medium">Store this API key securely</p>
                <p className="text-xs text-white/30 mt-1">
                  This is the only time your API key will be displayed. If
                  you lose it, you will need to generate a new one from the
                  dashboard settings.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#00ff88]/15 bg-[#00ff88]/[0.03] p-3">
            <Label className="text-xs text-[#888888] mb-1 block">
              API Key
            </Label>
            <code className="block text-xs font-mono text-[#00ff88] break-all select-all">
              {successData.api_key}
            </code>
          </div>

          <Button
            onClick={() => router.push("/login")}
            className="w-full bg-white text-black hover:bg-white/90 font-medium rounded-lg h-10 text-[13px]"
          >
            Continue to Sign In
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-center pb-6"
        >
          <p className="text-[12px] text-[#555555]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white font-medium hover:underline"
            >
              Sign In
            </Link>
          </p>
        </motion.div>
      </motion.div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="rounded-lg border border-white/[0.06] bg-white/[0.03] text-white"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="text-center pt-8 pb-2 px-6">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.06]">
          <UserPlus className="h-6 w-6 text-white" />
        </div>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Create Account
        </h2>
        <p className="text-[13px] text-[#555555] mt-1">
          Get started with your free account
        </p>
      </motion.div>

      <div className="px-6 pb-6">
        {/* Info box */}
        <motion.div variants={fadeUp} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-white/50 shrink-0 mt-0.5" />
            <div className="text-sm text-white/50">
              <p className="font-medium">Invitation-only registration</p>
              <p className="text-xs text-white/30 mt-1">
                Self-service registration creates a new organization. If your
                team already uses ReconPro, contact your administrator for an
                invitation instead.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Error */}
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
          {/* Full Name */}
          <motion.div variants={fadeUp} className="space-y-1.5">
            <Label htmlFor="name" className="text-[#888888] text-xs">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444444]" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-10 bg-white/[0.03] border-white/[0.06] pl-10 text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
              />
            </div>
          </motion.div>

          {/* Email */}
          <motion.div variants={fadeUp} className="space-y-1.5">
            <Label htmlFor="email" className="text-[#888888] text-xs">
              Email
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
          </motion.div>

          {/* Password with strength indicator */}
          <motion.div variants={fadeUp} className="space-y-1.5">
            <Label htmlFor="password" className="text-[#888888] text-xs">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444444]" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 bg-white/[0.03] border-white/[0.06] pl-10 pr-10 text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-[#888888] transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {/* Strength bar */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: pwStrength.width }}
                    transition={{ duration: 0.3 }}
                    style={{ backgroundColor: pwStrength.color }}
                  />
                </div>
                <p
                  className="text-[11px]"
                  style={{ color: pwStrength.color }}
                >
                  {pwStrength.label}
                </p>
              </div>
            )}
          </motion.div>

          {/* Confirm Password with match indicator */}
          <motion.div variants={fadeUp} className="space-y-1.5">
            <Label
              htmlFor="confirm-password"
              className="text-[#888888] text-xs"
            >
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444444]" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`h-10 bg-white/[0.03] border-white/[0.06] pl-10 pr-10 text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px] ${
                  passwordsMatch
                    ? "border-[#00ff88]/30 focus-visible:border-[#00ff88]/50"
                    : passwordsMismatch
                      ? "border-[#ff3355]/30 focus-visible:border-[#ff3355]/50"
                      : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-[#888888] transition-colors"
                tabIndex={-1}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              {/* Match / Mismatch indicator */}
              {passwordsMatch && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-10 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#00ff88]" />
                </motion.div>
              )}
              {passwordsMismatch && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-10 top-1/2 -translate-y-1/2"
                >
                  <AlertCircle className="h-4 w-4 text-[#ff3355]" />
                </motion.div>
              )}
            </div>
            {passwordsMismatch && (
              <p className="text-[11px] text-[#ff3355]">
                Passwords do not match
              </p>
            )}
          </motion.div>

          {/* Terms of Service */}
          <motion.div
            variants={fadeUp}
            className="flex items-start gap-2.5"
          >
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(v) => setAgreedToTerms(!!v)}
              className="border-white/[0.15] data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black mt-0.5 size-3.5 rounded-[3px]"
            />
            <label
              htmlFor="terms"
              className="text-[12px] text-[#666666] cursor-pointer leading-relaxed select-none"
            >
              I agree to the{" "}
              <Link
                href="/terms"
                className="text-white underline underline-offset-2 hover:text-[#999999] transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-white underline underline-offset-2 hover:text-[#999999] transition-colors"
              >
                Privacy Policy
              </Link>
            </label>
          </motion.div>

          {/* Submit */}
          <motion.div variants={fadeUp}>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-white/90 font-medium rounded-lg h-10 text-[13px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Account"
              )}
            </Button>
          </motion.div>
        </form>

        {/* Social separator */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[11px] text-[#444444] uppercase tracking-widest">
            or continue with
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Disabled social buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            disabled
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#444444] cursor-not-allowed opacity-50"
          >
            <Github className="h-4 w-4" />
            <span className="text-[12px]">GitHub</span>
          </button>
          <button
            type="button"
            disabled
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#444444] cursor-not-allowed opacity-50"
          >
            <GoogleIcon className="h-4 w-4" />
            <span className="text-[12px]">Google</span>
          </button>
        </div>

        {/* Footer link */}
        <div className="text-center pt-5">
          <p className="text-[12px] text-[#555555]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white font-medium hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
