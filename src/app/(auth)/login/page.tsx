"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  KeyRound,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Github,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Redirect to dashboard if user already has a valid session
function useRedirectIfAuth() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/dashboard", { credentials: "include" }).then((r) => {
      if (r.ok) {
        router.replace("/overview");
      }
    }).catch(() => {});
  }, [router]);
}

type LoginTab = "password" | "apikey";

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
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

// GitHub icon SVG (inline to avoid external dep)
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// Google icon SVG (inline)
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  useRedirectIfAuth();
  const [tab, setTab] = useState<LoginTab>("password");

  // ── Password login state ──────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

  // ── API key login state ──────────────────────────────────────────
  const [apiKey, setApiKey] = useState("");
  const [akError, setAkError] = useState("");
  const [akLoading, setAkLoading] = useState(false);
  const [akSuccess, setAkSuccess] = useState(false);

  // Reset success when tab changes
  useEffect(() => {
    setPwSuccess(false);
    setAkSuccess(false);
  }, [tab]);

  // ── Password login handler ────────────────────────────────────────
  const handlePasswordLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPwError("");
      setPwLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Login failed.");
        }

        if (data.api_key && !data.api_key.endsWith("...")) {
          localStorage.setItem("reconpro_api_key", data.api_key);
        }
        localStorage.setItem(
          "reconpro_auth",
          JSON.stringify({
            org_id: data.org_id,
            member_id: data.member?.id,
            member_name: data.member?.name,
            member_role: data.member?.role,
          })
        );

        setPwSuccess(true);
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect") || "/overview";
        setTimeout(() => router.push(redirect), 1200);
      } catch (err: unknown) {
        setPwError(
          err instanceof Error ? err.message : "Authentication failed."
        );
        setErrorKey((k) => k + 1);
      } finally {
        setPwLoading(false);
      }
    },
    [email, password, router]
  );

  // ── API key login handler ────────────────────────────────────────
  const handleApiKeyLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAkError("");
      setAkLoading(true);
      try {
        const res = await fetch("/api/v1/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: apiKey }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Invalid API key.");
        }
        if (!data.valid) {
          throw new Error(data.error || "API key validation failed.");
        }
        localStorage.setItem("reconpro_api_key", apiKey.trim());
        localStorage.setItem(
          "reconpro_auth",
          JSON.stringify({
            org_id: data.org_id,
            key_prefix: data.key_prefix,
            key_name: data.key_name,
            scopes: data.scopes,
          })
        );

        setAkSuccess(true);
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect") || "/overview";
        setTimeout(() => router.push(redirect), 1200);
      } catch (err: unknown) {
        setAkError(
          err instanceof Error ? err.message : "Authentication failed."
        );
      } finally {
        setAkLoading(false);
      }
    },
    [apiKey, router]
  );

  // ── Social separator ──────────────────────────────────────────────
  const SocialSeparator = () => (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="text-[11px] text-[#444444] uppercase tracking-widest">
        or continue with
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );

  // ── Success overlay ───────────────────────────────────────────────
  const SuccessOverlay = () => (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          delay: 0.1,
        }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00ff88]/10"
      >
        <CheckCircle2 className="h-7 w-7 text-[#00ff88]" />
      </motion.div>
      <p className="text-sm font-medium text-white">
        Redirecting to dashboard…
      </p>
    </motion.div>
  );

  return (
    <div className="w-full max-w-sm">
      {/* Heading */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="text-center mb-8"
      >
        <motion.h1
          variants={fadeUp}
          className="text-xl font-semibold text-white tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Sign in to your account
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="text-[13px] text-[#555555] mt-1.5"
        >
          Authenticate to access your security dashboard
        </motion.p>
      </motion.div>

      {/* Success state */}
      <AnimatePresence mode="wait">
        {pwSuccess || akSuccess ? (
          <SuccessOverlay key="success-overlay" />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as LoginTab)}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-2 bg-white/[0.03] border border-white/[0.06] rounded-lg h-10">
                <TabsTrigger
                  value="password"
                  className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-medium text-[#666666] text-[13px] rounded-md h-9 transition-all duration-200"
                >
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Password
                </TabsTrigger>
                <TabsTrigger
                  value="apikey"
                  className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-medium text-[#666666] text-[13px] rounded-md h-9 transition-all duration-200"
                >
                  <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                  API Key
                </TabsTrigger>
              </TabsList>

              {/* ── Password Login Tab ──────────────────────────────── */}
              <TabsContent value="password" className="mt-5 space-y-4">
                <AnimatePresence mode="wait">
                  {pwError && (
                    <motion.div
                      key={`pw-err-${errorKey}`}
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="rounded-lg border border-[#ff3355]/25 bg-[#ff3355]/[0.05] px-4 py-3 text-[13px] text-[#ff3355]"
                    >
                      {pwError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                  <motion.div
                    className="space-y-1.5"
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                  >
                    <Label
                      htmlFor="login-email"
                      className="text-[#888888] text-xs"
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444444]" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-10 bg-white/[0.03] border-white/[0.06] pl-10 text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.1,
                      duration: 0.4,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    <Label
                      htmlFor="login-password"
                      className="text-[#888888] text-xs"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444444]" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
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
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>

                  {/* Remember me + Forgot password row */}
                  <motion.div
                    className="flex items-center justify-between"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.18 }}
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={rememberMe}
                        onCheckedChange={(v) => setRememberMe(!!v)}
                        className="border-white/[0.15] data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black size-3.5 rounded-[3px]"
                      />
                      <span className="text-[12px] text-[#666666]">
                        Remember me
                      </span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[12px] text-[#555555] hover:text-[#999999] transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 }}
                  >
                    <Button
                      type="submit"
                      disabled={pwLoading}
                      className="w-full bg-white text-black hover:bg-white/90 font-medium rounded-lg h-10 text-[13px]"
                    >
                      {pwLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </motion.div>
                </form>

                <SocialSeparator />

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

                <div className="text-center pt-1">
                  <p className="text-[12px] text-[#555555]">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/register"
                      className="text-white font-medium hover:underline"
                    >
                      Create one
                    </Link>
                  </p>
                </div>
              </TabsContent>

              {/* ── API Key Login Tab ──────────────────────────────── */}
              <TabsContent value="apikey" className="mt-5 space-y-4">
                <AnimatePresence mode="wait">
                  {akError && (
                    <motion.div
                      key="ak-err"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="rounded-lg border border-[#ff3355]/25 bg-[#ff3355]/[0.05] px-4 py-3 text-[13px] text-[#ff3355]"
                    >
                      {akError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleApiKeyLogin} className="space-y-3.5">
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.05,
                      duration: 0.4,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    <Label
                      htmlFor="api-key"
                      className="text-[#888888] text-xs"
                    >
                      API Key
                    </Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="rp_live_abc123..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      required
                      className="h-10 bg-white/[0.03] border-white/[0.06] font-mono text-[13px] text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg"
                    />
                    <p className="text-[11px] text-[#444444]">
                      Your API key is hashed with SHA-256 before storage.
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Button
                      type="submit"
                      disabled={akLoading}
                      className="w-full bg-white text-black hover:bg-white/90 font-medium rounded-lg h-10 text-[13px]"
                    >
                      {akLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Authenticate"
                      )}
                    </Button>
                  </motion.div>
                </form>

                <SocialSeparator />

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

                <div className="text-center pt-1">
                  <p className="text-[12px] text-[#555555]">
                    Don&apos;t have an API key?{" "}
                    <Link
                      href="/register"
                      className="text-white font-medium hover:underline"
                    >
                      Create an account
                    </Link>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
