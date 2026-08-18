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

// ─── Settings Section Wrapper ─────────────────────────────────────

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bento-tile p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#888888]" />
        </div>
        <div>
          <h2 className="text-[15px] font-medium text-white">{title}</h2>
          <p className="text-[12px] text-[#555555]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between py-1">
        <div className="space-y-0.5 pr-4">
          <p className="text-[13px] font-medium text-[#cccccc]">{label}</p>
          <p className="text-[11px] text-[#555555] leading-relaxed">{description}</p>
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

  const loadProfile = useCallback(() => {
    fetch("/api/members", { headers: authHeaders })
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
  }, [authHeaders]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      // Strip role from the update payload — role is managed server-side
      const { role: _role, ...safeProfile } = profile;
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
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
            <p className="text-sm text-[#555555]">Manage your account and preferences.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Shield className="w-4 h-4 text-[#555555]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
          <p className="text-sm text-[#555555]">Manage your account and preferences.</p>
        </div>
      </div>

      {/* Profile Section */}
      <SettingsSection
        icon={User}
        title="Profile"
        description="Manage your account information"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-4 py-3 text-[13px] text-[#ff3355]">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/[0.04] px-4 py-3 text-[13px] text-[#00ff88] flex items-center gap-2">
              <Check className="h-3.5 w-3.5" />
              Changes saved successfully.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name" className="text-[#888888] text-xs">
                Full Name
              </Label>
              <Input
                id="settings-name"
                type="text"
                placeholder="Your name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="h-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-email" className="text-[#888888] text-xs">
                Email
              </Label>
              <Input
                id="settings-email"
                type="email"
                placeholder="you@company.com"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="h-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-[#444444] focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-role" className="text-[#888888] text-xs">
              Role
            </Label>
            <Input
              id="settings-role"
              type="text"
              value={profile.role}
              readOnly
              disabled
              className="h-10 bg-white/[0.02] border-white/[0.04] text-white/50 placeholder:text-[#444444] rounded-lg text-[13px] max-w-sm cursor-not-allowed"
            />
            <p className="text-[11px] text-[#444444] mt-1">Role is assigned by your organization administrator.</p>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="bg-white text-black hover:bg-white/90 font-medium rounded-lg h-10 px-5 text-[13px]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </form>
      </SettingsSection>

      {/* API Keys Section */}
      <SettingsSection
        icon={Key}
        title="API Keys"
        description="Manage your API keys for programmatic access"
      >
        {apiKeys.length === 0 ? (
          <div className="rounded-lg bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#999999]">No API keys</p>
                <p className="text-[11px] text-[#555555] mt-0.5">
                  Generate a key to enable programmatic access
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-white/[0.02] p-4 space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[#cccccc]">{key.name}</p>
                  <p className="text-[11px] text-[#555555] font-mono mt-1">{key.prefix}</p>
                </div>
                <span className="text-[11px] font-medium text-[#00ff88]">
                  {key.status}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            disabled
            className="border-white/[0.06] bg-transparent text-[#555555] font-medium cursor-not-allowed rounded-lg h-9 text-[12px]"
            title="API key generation is not yet available"
          >
            Generate New Key
          </Button>
        </div>
      </SettingsSection>

      {/* Notifications Section */}
      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Configure how you receive alerts and updates"
      >
        <div className="space-y-0">
          <ToggleRow
            label="Email Notifications"
            description="Receive critical alerts via email"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <ToggleRow
            label="Scan Completion Alerts"
            description="Get notified when scans finish running"
            checked={scanAlerts}
            onChange={setScanAlerts}
          />
          <ToggleRow
            label="Critical Findings"
            description="Immediate alerts for high-severity discoveries"
            checked={criticalAlerts}
            onChange={setCriticalAlerts}
          />
          <ToggleRow
            label="Weekly Digest"
            description="Summary report delivered every Monday"
            checked={weeklyDigest}
            onChange={setWeeklyDigest}
          />
          <ToggleRow
            label="Slack Integration"
            description="Push notifications to your Slack workspace"
            checked={slackIntegration}
            onChange={setSlackIntegration}
          />
        </div>
      </SettingsSection>

      {/* Security Section */}
      <SettingsSection
        icon={Shield}
        title="Security"
        description="Manage your security preferences"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-[#cccccc]">Two-Factor Authentication</p>
              <p className="text-[11px] text-[#555555]">Add an extra layer of security to your account</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="border-white/[0.06] bg-transparent text-[#555555] cursor-not-allowed rounded-lg h-8 text-[12px]"
            >
              Coming Soon
            </Button>
          </div>
          <Separator className="bg-white/[0.04]" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-[#cccccc]">Active Sessions</p>
              <p className="text-[11px] text-[#555555]">Manage your active login sessions</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="border-white/[0.06] bg-transparent text-[#555555] cursor-not-allowed rounded-lg h-8 text-[12px]"
            >
              Coming Soon
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}