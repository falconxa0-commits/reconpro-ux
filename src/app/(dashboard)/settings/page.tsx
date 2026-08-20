"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { User, Key, Bell, Shield, Loader2, Check } from "lucide-react";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

interface ProfileData {
  name: string;
  email: string;
  role: string;
}

function SettingsSection({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Icon className="h-4 w-4 text-neutral-600" />
        </div>
        <div>
          <h2 className="text-[14px] font-medium text-white">{title}</h2>
          <p className="text-[11px] text-neutral-600">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between py-3">
        <div className="space-y-0.5 pr-4">
          <p className="text-[13px] font-medium text-neutral-300">{label}</p>
          <p className="text-[11px] text-neutral-600 leading-relaxed">{description}</p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/10"
        />
      </div>
      <Separator className="bg-white/[0.04]" />
    </>
  );
}

export default function SettingsPage() {
  const authHeaders = useAuthHeaders();
  const [profile, setProfile] = useState<ProfileData>({ name: "", email: "", role: "" });
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; prefix: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [scanAlerts, setScanAlerts] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [slackIntegration, setSlackIntegration] = useState(false);

  const loadProfile = useCallback(() => {
    fetch("/api/members", { headers: authHeaders })
      .then(r => { if (!r.ok) throw new Error('Failed to load profile'); return r.json(); })
      .then((data) => {
        const members = data.members || [];
        if (members.length > 0) {
          const m = members[0];
          setProfile({ name: m.name || "", email: m.email || "", role: m.role || "" });
        }
      })
      .catch(() => setError("Failed to load profile data."))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaved(false); setError("");
    try {
      const { role: _role, ...safeProfile } = profile;
      // TODO: use /api/members/${user.id} once user.id is available from auth context
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(safeProfile),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save changes.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon"><div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /></div>
          <div><h1>Settings</h1><p>Manage your account and preferences.</p></div>
        </div>
        <div className="grid grid-cols-1 gap-3 max-w-2xl">
          <div className="skeleton-pulse h-40 rounded-xl" />
          <div className="skeleton-pulse h-60 rounded-xl" />
          <div className="skeleton-pulse h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div className="page-header-icon text-neutral-500"><Shield /></div>
        <div><h1>Settings</h1><p>Manage your account and preferences.</p></div>
      </div>

      <div className="space-y-3">
        {/* Profile */}
        <SettingsSection icon={User} title="Profile" description="Manage your account information">
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-3 text-[13px] text-[#ff6677]">{error}</div>
            )}
            {saved && (
              <div className="rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/[0.04] px-4 py-3 text-[13px] text-[#00ff88] flex items-center gap-2">
                <Check className="h-3.5 w-3.5" />Changes saved successfully.</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="settings-name" className="text-neutral-600 text-[11px] tracking-wide uppercase">Full Name</Label>
                <Input id="settings-name" type="text" placeholder="Your name" value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="h-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-700 focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-email" className="text-neutral-600 text-[11px] tracking-wide uppercase">Email</Label>
                <Input id="settings-email" type="email" placeholder="you@company.com" value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="h-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-700 focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-role" className="text-neutral-600 text-[11px] tracking-wide uppercase">Role</Label>
              <Input id="settings-role" type="text" value={profile.role} readOnly disabled
                className="h-10 bg-white/[0.02] border-white/[0.04] text-white/40 rounded-lg text-[13px] max-w-sm cursor-not-allowed" />
              <p className="text-[11px] text-neutral-700 mt-1">Role is assigned by your organization administrator.</p>
            </div>
            <Button type="submit" disabled={saving}
              className="bg-white text-black hover:bg-white/90 font-medium rounded-lg h-10 px-5 text-[13px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </form>
        </SettingsSection>

        {/* API Keys */}
        <SettingsSection icon={Key} title="API Keys" description="Manage your API keys for programmatic access">
          {apiKeys.length === 0 ? (
            <div className="rounded-lg bg-white/[0.02] p-4">
              <p className="text-[13px] font-medium text-neutral-400">No API keys</p>
              <p className="text-[11px] text-neutral-600 mt-0.5">Generate a key to enable programmatic access</p>
            </div>
          ) : (
            <div className="rounded-lg bg-white/[0.02] p-4 space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-neutral-300">{key.name}</p>
                    <p className="text-[11px] text-neutral-600 font-mono mt-1">{key.prefix}</p>
                  </div>
                  <span className="text-[11px] font-medium text-[#00ff88]">{key.status}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button type="button" variant="outline" disabled
              className="border-white/[0.06] bg-transparent text-neutral-600 font-medium cursor-not-allowed rounded-lg h-9 text-[12px]"
              title="API key generation is not yet available">Generate New Key</Button>
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection icon={Bell} title="Notifications" description="Configure how you receive alerts and updates">
          <ToggleRow label="Email Notifications" description="Receive critical alerts via email" checked={emailNotifications} onChange={setEmailNotifications} />
          <ToggleRow label="Scan Completion Alerts" description="Get notified when scans finish running" checked={scanAlerts} onChange={setScanAlerts} />
          <ToggleRow label="Critical Findings" description="Immediate alerts for high-severity discoveries" checked={criticalAlerts} onChange={setCriticalAlerts} />
          <ToggleRow label="Weekly Digest" description="Summary report delivered every Monday" checked={weeklyDigest} onChange={setWeeklyDigest} />
          <ToggleRow label="Slack Integration" description="Push notifications to your Slack workspace" checked={slackIntegration} onChange={setSlackIntegration} />
        </SettingsSection>

        {/* Security */}
        <SettingsSection icon={Shield} title="Security" description="Manage your security preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[13px] font-medium text-neutral-300">Two-Factor Authentication</p>
                <p className="text-[11px] text-neutral-600">Add an extra layer of security to your account</p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled
                className="border-white/[0.06] bg-transparent text-neutral-600 cursor-not-allowed rounded-lg h-8 text-[12px]">Coming Soon</Button>
            </div>
            <Separator className="bg-white/[0.04]" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[13px] font-medium text-neutral-300">Active Sessions</p>
                <p className="text-[11px] text-neutral-600">Manage your active login sessions</p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled
                className="border-white/[0.06] bg-transparent text-neutral-600 cursor-not-allowed rounded-lg h-8 text-[12px]">Coming Soon</Button>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}