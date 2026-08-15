"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { KeyRound, Lock, Mail, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApiKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid API key.");
      }
      const data = await res.json();
      if (!data.valid) {
        throw new Error(data.error || "API key validation failed.");
      }
      // Store auth state in localStorage for dashboard components to read
      localStorage.setItem("reconpro_auth", JSON.stringify({
        org_id: data.org_id,
        key_prefix: data.key_prefix,
        key_name: data.key_name,
        scopes: data.scopes,
      }));
      // Set a cookie so middleware can guard dashboard routes
      document.cookie = "reconpro_auth=authenticated; path=/; max-age=86400; SameSite=Lax";
      // Redirect to original destination or overview
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/overview";
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
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
          Authenticate with your ReconPro API key
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-400/80">
              <p className="font-medium">API key authentication only</p>
              <p className="text-xs text-amber-400/60 mt-1">
                Email/password login is not yet implemented. Generate an API key from
                the dashboard settings once you have an account, or sign in with a key
                provisioned by your organization administrator.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
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
            disabled={loading}
            className="w-full bg-white text-black hover:bg-zinc-200 font-medium"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Authenticate"
            )}
          </Button>
        </form>

        <div className="text-center space-y-2 pt-2">
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
      </CardContent>
      <CardFooter className="flex-col gap-2 justify-center">
        <Link
          href="/forgot-password"
          className="text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Forgot your API key?
        </Link>
      </CardFooter>
    </Card>
  );
}
