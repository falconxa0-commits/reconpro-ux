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
    <Card className="border-white/[0.06] bg-white/[0.03] text-white rounded-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.06]">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Forgot Password
        </CardTitle>
        <CardDescription className="text-[#555555]">
          Check your email for reset instructions
        </CardDescription>
      </CardHeader>

      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              <p className="font-medium">If an account exists with this email, password reset instructions will be sent.</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs text-white/50">
                Password reset links are sent when the email delivery service is configured. Contact your administrator for manual password reset.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-xs text-[#555555] hover:text-[#999999] transition-colors"
            >
              ← Back to form
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-3 text-[13px] text-[#ff3355]">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#888888] text-xs">
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
              </Button>
            </form>
          </>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#555555] hover:text-[#999999] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
}
