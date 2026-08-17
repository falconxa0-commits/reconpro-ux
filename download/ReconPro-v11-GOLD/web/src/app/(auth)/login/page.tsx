"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Loader2, Mail, Lock } from "lucide-react";

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

      // Store API key for dashboard API calls
      if (data.api_key) {
        localStorage.setItem("reconpro_api_key", data.api_key);
      }
      localStorage.setItem("reconpro_auth", JSON.stringify({
        org_id: data.org_id,
        member_id: data.member?.id,
        member_name: data.member?.name,
        member_role: data.member?.role,
      }));
      // Session cookie is set by the server via Set-Cookie header (HttpOnly)
      // No need to manually set document.cookie

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
      // For API key login, set a session marker cookie
      // The server doesn't set a cookie for API key login, so we set one client-side
      // This is acceptable because the API key itself provides the real auth
      document.cookie = "reconpro_session=apikey-auth; path=/; max-age=86400; SameSite=Lax";

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
    <Card className="border-zinc-800 bg-zinc-950 text-white">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
          <KeyRound className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Sign In
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Authenticate to access your ReconPro dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as LoginTab)}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-2 bg-zinc-900 border-zinc-800">
            <TabsTrigger
              value="password"
              className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-medium text-zinc-400 text-sm"
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Password
            </TabsTrigger>
            <TabsTrigger
              value="apikey"
              className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-medium text-zinc-400 text-sm"
            >
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />
              API Key
            </TabsTrigger>
          </TabsList>

          {/* ── Password Login Tab ─────────────────────────────────── */}
          <TabsContent value="password" className="mt-4 space-y-4">
            {pwError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {pwError}
              </div>
            )}

            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-zinc-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-zinc-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={pwLoading}
                className="w-full bg-white text-black hover:bg-zinc-200 font-medium"
              >
                {pwLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="text-center space-y-2 pt-1">
              <p className="text-xs text-zinc-500">
                Don&apos;t have an account?
              </p>
              <Link
                href="/register"
                className="text-xs text-white font-medium hover:underline"
              >
                Create an account
              </Link>
            </div>
          </TabsContent>

          {/* ── API Key Login Tab ──────────────────────────────────── */}
          <TabsContent value="apikey" className="mt-4 space-y-4">
            {akError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {akError}
              </div>
            )}

            <form onSubmit={handleApiKeyLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-zinc-300">
                  API Key
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="rp_live_abc123..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  className="border-zinc-800 bg-zinc-900 font-mono text-sm text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
                />
                <p className="text-xs text-zinc-500">
                  Your API key is hashed with SHA-256 before storage. It is never stored
                  in plaintext.
                </p>
              </div>
              <Button
                type="submit"
                disabled={akLoading}
                className="w-full bg-white text-black hover:bg-zinc-200 font-medium"
              >
                {akLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Authenticate"
                )}
              </Button>
            </form>

            <div className="text-center space-y-2 pt-1">
              <p className="text-xs text-zinc-500">
                Don&apos;t have an API key?
              </p>
              <Link
                href="/register"
                className="text-xs text-white font-medium hover:underline"
              >
                Create an account to generate one
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex-col gap-2 justify-center">
        <Link
          href="/forgot-password"
          className="text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Forgot your password?
        </Link>
      </CardFooter>
    </Card>
  );
}
