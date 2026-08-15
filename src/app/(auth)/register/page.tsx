"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, UserPlus, User, Loader2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "placeholder" },
        body: JSON.stringify({ name: fullName, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Registration failed (HTTP ${res.status})`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration requires an existing API key with member creation permissions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-950 text-white">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
          <UserPlus className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create Account
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Get started with your free account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-400/80">
              <p className="font-medium">Invitation-only registration</p>
              <p className="text-xs text-amber-400/60 mt-1">
                Self-service registration is not yet available. Accounts are created by
                organization administrators. Contact your admin for an invitation, or
                sign in with an API key if you already have one.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="email"
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
            <Label htmlFor="password" className="text-zinc-300">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-zinc-300">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            title="Registration is invitation-only. Contact your organization administrator for an invitation."
            className="w-full bg-white text-black hover:bg-zinc-200 font-medium"
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
        <p className="text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
