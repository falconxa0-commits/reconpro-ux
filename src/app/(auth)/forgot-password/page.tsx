"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-950 text-white">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Forgot Password
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Check your email for reset instructions
        </CardDescription>
      </CardHeader>

      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              <p className="font-medium">If an account exists with this email, password reset instructions will be sent.</p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-4">
              <p className="text-xs text-amber-400/80">
                Full password reset via email is not yet implemented. Please contact
                your organization administrator or use API key authentication in the
                meantime.
              </p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">
                  Email Address
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
                <p className="text-xs text-zinc-500">
                  We&apos;ll send a password reset link to your email address.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-zinc-200 font-medium"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
              </Button>
            </form>
          </>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
}
