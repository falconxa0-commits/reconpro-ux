"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, UserPlus, User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ api_key: string; org_id: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessData(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Registration failed (HTTP ${res.status})`);
      }

      // Store the API key in localStorage (shown only once)
      if (data.api_key) {
        localStorage.setItem("reconpro_api_key", data.api_key);
      }
      setSuccessData({ api_key: data.api_key, org_id: data.org_id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success state: show API key once ─────────────────────────────
  if (successData) {
    return (
      <Card className="border-white/[0.06] bg-white/[0.03] text-white rounded-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Account Created
          </CardTitle>
          <CardDescription className="text-[#555555]">
            Save your API key — it will not be shown again
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-white/50 shrink-0 mt-0.5" />
              <div className="text-sm text-white/50">
                <p className="font-medium">Store this API key securely</p>
                <p className="text-xs text-white/30 mt-1">
                  This is the only time your API key will be displayed. If you lose it,
                  you will need to generate a new one from the dashboard settings.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <Label className="text-xs text-[#888888] mb-1 block">API Key</Label>
            <code className="block text-xs font-mono text-emerald-400 break-all select-all">
              {successData.api_key}
            </code>
          </div>

          <Button
            onClick={() => router.push("/login")}
            className="w-full bg-white text-black hover:bg-white/90 font-medium rounded-lg h-10 text-[13px]"
          >
            Continue to Sign In
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-[12px] text-[#555555]">
            Already have an account?{" "}
            <Link href="/login" className="text-white font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    );
  }

  // ── Registration form ─────────────────────────────────────────────
  return (
    <Card className="border-white/[0.06] bg-white/[0.03] text-white rounded-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.06]">
          <UserPlus className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create Account
        </CardTitle>
        <CardDescription className="text-[#555555]">
          Get started with your free account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-white/50 shrink-0 mt-0.5" />
            <div className="text-sm text-white/50">
              <p className="font-medium">Invitation-only registration</p>
              <p className="text-xs text-white/30 mt-1">
                Self-service registration creates a new organization. If your team already
                uses ReconPro, contact your administrator for an invitation instead.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-3 text-[13px] text-[#ff3355]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
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
          </div>
          <div className="space-y-2">
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#888888] text-xs">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444444]" />
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 bg-white/[0.03] border-white/[0.06] pl-10 text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-[#888888] text-xs">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444444]" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-10 bg-white/[0.03] border-white/[0.06] pl-10 text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
              />
            </div>
          </div>
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
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-[12px] text-[#555555]">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
