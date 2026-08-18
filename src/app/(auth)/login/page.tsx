"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Loader2, Mail, Lock, Shield } from "lucide-react";

type LoginTab = "password" | "apikey";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<LoginTab>("password");

  // ── Password login state ──────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // ── API key login state ──────────────────────────────────────────
  const [apiKey, setApiKey] = useState("");
  const [akError, setAkError] = useState("");
  const [akLoading, setAkLoading] = useState(false);

  // ── Password login handler ────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
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

      // Only store the API key if it's a full key (not a truncated stub).
      // The dashboard authenticates via session cookie; a truncated key
      // would cause api-protection.ts to attempt key-auth (which fails)
      // and skip the session-cookie fallback.
      if (data.api_key && !data.api_key.endsWith("...")) {
        localStorage.setItem("reconpro_api_key", data.api_key);
      }
      localStorage.setItem("reconpro_auth", JSON.stringify({
        org_id: data.org_id,
        member_id: data.member?.id,
        member_name: data.member?.name,
        member_role: data.member?.role,
      }));

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/overview";
      router.push(redirect);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setPwLoading(false);
    }
  };

  // ── API key login handler ────────────────────────────────────────
  const handleApiKeyLogin = async (e: React.FormEvent) => {
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
      localStorage.setItem("reconpro_auth", JSON.stringify({
        org_id: data.org_id,
        key_prefix: data.key_prefix,
        key_name: data.key_name,
        scopes: data.scopes,
      }));

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/overview";
      router.push(redirect);
    } catch (err: unknown) {
      setAkError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setAkLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <Shield className="h-4 w-4 text-[#00ff88]" />
          </div>
          <span className="text-[15px] font-semibold text-white">ReconPro</span>
        </div>
      </div>

      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-xl font-semibold text-white tracking-tight">Sign in to your account</h1>
        <p className="text-[13px] text-[#555555] mt-1.5">Authenticate to access your security dashboard</p>
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as LoginTab)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 bg-white/[0.03] border border-white/[0.06] rounded-lg h-10">
          <TabsTrigger
            value="password"
            className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-medium text-[#666666] text-[13px] rounded-md h-9"
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Password
          </TabsTrigger>
          <TabsTrigger
            value="apikey"
            className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-medium text-[#666666] text-[13px] rounded-md h-9"
          >
            <KeyRound className="h-3.5 w-3.5 mr-1.5" />
            API Key
          </TabsTrigger>
        </TabsList>

        {/* ── Password Login Tab ─────────────────────────────────── */}
        <TabsContent value="password" className="mt-5 space-y-4">
          {pwError && (
            <div className="rounded-lg border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-3 text-[13px] text-[#ff3355]">
              {pwError}
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-[#888888] text-xs">
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password" className="text-[#888888] text-xs">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444444]" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 bg-white/[0.03] border-white/[0.06] pl-10 text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
                />
              </div>
            </div>
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
          </form>

          <div className="text-center pt-1">
            <p className="text-[12px] text-[#555555]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-white font-medium hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </TabsContent>

        {/* ── API Key Login Tab ──────────────────────────────────── */}
        <TabsContent value="apikey" className="mt-5 space-y-4">
          {akError && (
            <div className="rounded-lg border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-3 text-[13px] text-[#ff3355]">
              {akError}
            </div>
          )}

          <form onSubmit={handleApiKeyLogin} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="api-key" className="text-[#888888] text-xs">
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
            </div>
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
          </form>

          <div className="text-center pt-1">
            <p className="text-[12px] text-[#555555]">
              Don&apos;t have an API key?{" "}
              <Link href="/register" className="text-white font-medium hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer link */}
      <div className="text-center mt-6">
        <Link href="/forgot-password" className="text-[12px] text-[#555555] hover:text-[#999999] transition-colors">
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}
