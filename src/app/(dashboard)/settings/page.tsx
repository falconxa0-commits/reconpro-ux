"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Key, Bell, Shield, Loader2, Check } from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    role: "",
  });
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; prefix: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Notification toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [scanAlerts, setScanAlerts] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [slackIntegration, setSlackIntegration] = useState(false);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((data) => {
        const members = data.members || [];
        if (members.length > 0) {
          const m = members[0];
          setProfile({
            name: m.name || "",
            email: m.email || "",
            role: m.role || "",
          });
        }
      })
      .catch(() => setError("Failed to load profile data."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save changes.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div className="text-white/40 text-sm">Loading settings...</div>
      </div>
    );
  }

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
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Changes saved successfully.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name" className="text-zinc-300">
                  Full Name
                </Label>
                <Input
                  id="settings-name"
                  type="text"
                  placeholder="Your name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
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
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
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
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-600"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-white text-black hover:bg-zinc-200 font-medium"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
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
          {apiKeys.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">No API keys generated yet</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Generate a key to enable programmatic access
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-zinc-700/30 px-2.5 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-700/30">
                  None
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{key.name}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">{key.prefix}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                    {key.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            disabled
            className="border-zinc-700 bg-transparent text-zinc-500 font-medium cursor-not-allowed"
            title="API key generation is not yet available"
          >
            Generate New Key
          </Button>
          <p className="text-xs text-zinc-600 mt-1">API key generation is not yet available.</p>
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
                aria-checked={emailNotifications}
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 ${emailNotifications ? 'bg-white' : 'bg-zinc-700'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform ${emailNotifications ? 'bg-black translate-x-5' : 'bg-zinc-400 translate-x-0'}`} />
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
                aria-checked={scanAlerts}
                onClick={() => setScanAlerts(!scanAlerts)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 ${scanAlerts ? 'bg-white' : 'bg-zinc-700'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform ${scanAlerts ? 'bg-black translate-x-5' : 'bg-zinc-400 translate-x-0'}`} />
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
                aria-checked={criticalAlerts}
                onClick={() => setCriticalAlerts(!criticalAlerts)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 ${criticalAlerts ? 'bg-white' : 'bg-zinc-700'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform ${criticalAlerts ? 'bg-black translate-x-5' : 'bg-zinc-400 translate-x-0'}`} />
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
                aria-checked={weeklyDigest}
                onClick={() => setWeeklyDigest(!weeklyDigest)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 ${weeklyDigest ? 'bg-white' : 'bg-zinc-700'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform ${weeklyDigest ? 'bg-black translate-x-5' : 'bg-zinc-400 translate-x-0'}`} />
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
                aria-checked={slackIntegration}
                onClick={() => setSlackIntegration(!slackIntegration)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 ${slackIntegration ? 'bg-white' : 'bg-zinc-700'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform ${slackIntegration ? 'bg-black translate-x-5' : 'bg-zinc-400 translate-x-0'}`} />
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
              disabled
              className="border-zinc-700 bg-transparent text-zinc-500 cursor-not-allowed"
              title="Two-factor authentication is not yet available"
            >
              Not Available
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
              disabled
              className="border-zinc-700 bg-transparent text-zinc-500 cursor-not-allowed"
              title="Session management is not yet available"
            >
              Not Available
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
