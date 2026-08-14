import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Key, Bell, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Profile Section */}
      <Card className="border-zinc-800 bg-zinc-950 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription className="text-zinc-400">
                Manage your account information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name" className="text-zinc-300">
                  Full Name
                </Label>
                <Input
                  id="settings-name"
                  type="text"
                  placeholder="John Doe"
                  defaultValue="John Doe"
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email" className="text-zinc-300">
                  Email
                </Label>
                <Input
                  id="settings-email"
                  type="email"
                  placeholder="you@company.com"
                  defaultValue="john@company.com"
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-role" className="text-zinc-300">
                Role
              </Label>
              <Input
                id="settings-role"
                type="text"
                placeholder="Security Engineer"
                defaultValue="Security Engineer"
                className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
              />
            </div>
            <Button
              type="submit"
              className="bg-white text-black hover:bg-zinc-200 font-medium"
            >
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* API Keys Section */}
      <Card className="border-zinc-800 bg-zinc-950 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Key className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">API Keys</CardTitle>
              <CardDescription className="text-zinc-400">
                Manage your API keys for programmatic access
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Production Key</p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  rk_live_••••••••••••••••a4f2
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>
            <Separator className="bg-zinc-800" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Development Key</p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  rk_test_••••••••••••••••b7e1
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white font-medium"
          >
            Generate New Key
          </Button>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card className="border-zinc-800 bg-zinc-950 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription className="text-zinc-400">
                Configure how you receive alerts and updates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">
                  Email Notifications
                </p>
                <p className="text-xs text-zinc-500">
                  Receive critical alerts via email
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="true"
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
              >
                <span className="pointer-events-none block h-5 w-5 rounded-full bg-black shadow-lg ring-0 transition-transform translate-x-5" />
              </button>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Scan Completion */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">
                  Scan Completion Alerts
                </p>
                <p className="text-xs text-zinc-500">
                  Get notified when scans finish running
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="true"
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
              >
                <span className="pointer-events-none block h-5 w-5 rounded-full bg-black shadow-lg ring-0 transition-transform translate-x-5" />
              </button>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Critical Findings */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">
                  Critical Findings
                </p>
                <p className="text-xs text-zinc-500">
                  Immediate alerts for high-severity discoveries
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="true"
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
              >
                <span className="pointer-events-none block h-5 w-5 rounded-full bg-black shadow-lg ring-0 transition-transform translate-x-5" />
              </button>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Weekly Digest */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">Weekly Digest</p>
                <p className="text-xs text-zinc-500">
                  Summary report delivered every Monday
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="false"
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
              >
                <span className="pointer-events-none block h-5 w-5 rounded-full bg-zinc-400 shadow-lg ring-0 transition-transform translate-x-0" />
              </button>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Slack Integration */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">
                  Slack Integration
                </p>
                <p className="text-xs text-zinc-500">
                  Push notifications to your Slack workspace
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="false"
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600"
              >
                <span className="pointer-events-none block h-5 w-5 rounded-full bg-zinc-400 shadow-lg ring-0 transition-transform translate-x-0" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="border-zinc-800 bg-zinc-950 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription className="text-zinc-400">
                Manage your security preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
              <p className="text-xs text-zinc-500">Add an extra layer of security to your account</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white"
            >
              Enable
            </Button>
          </div>
          <Separator className="bg-zinc-800" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">Active Sessions</p>
              <p className="text-xs text-zinc-500">Manage your active login sessions</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white"
            >
              View Sessions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
