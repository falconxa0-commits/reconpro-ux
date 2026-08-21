"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { User, Key, Bell, Shield, AlertTriangle, Loader2, Check, Search, Eye, EyeOff, Trash2 } from "lucide-react";
import { useAuthHeaders } from "@/hooks/use-auth-headers";
import { useCurrentUser } from "@/hooks/use-current-user";

interface ProfileData {
  name: string;
  email: string;
  role: string;
}

type SettingsTab = "profile" | "api-keys" | "notifications" | "security" | "danger-zone";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; keywords: string[] }[] = [
  { id: "profile", label: "Profile", icon: User, keywords: ["profile", "name", "email", "avatar", "account", "personal", "user", "member"] },
  { id: "api-keys", label: "API Keys", icon: Key, keywords: ["api", "key", "keys", "token", "access", "generate", "programmatic"] },
  { id: "notifications", label: "Notifications", icon: Bell, keywords: ["notification", "alert", "email", "slack", "digest", "scan", "critical"] },
  { id: "security", label: "Security", icon: Shield, keywords: ["security", "2fa", "two-factor", "password", "session", "authentication"] },
  { id: "danger-zone", label: "Danger Zone", icon: AlertTriangle, keywords: ["danger", "delete", "remove", "account", "destroy", "deactivate"] },
];

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
  const currentUser = useCurrentUser();
  const [profile, setProfile] = useState<ProfileData>({ name: "", email: "", role: "" });
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; prefix: string; status: string; createdAt: string; lastUsed: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [searchQuery, setSearchQuery] = useState("");

  // Notification toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [scanAlerts, setScanAlerts] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [slackNotifications, setSlackNotifications] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Usage stats from scans
  const [usageStats, setUsageStats] = useState({ scansThisMonth: 0, totalFindings: 0 });

  const loadProfile = useCallback(() => {
    fetch("/api/members", { headers: authHeaders })
      .then(r => { if (!r.ok) throw new Error("Failed to load profile"); return r.json(); })
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

  const loadApiKeys = useCallback(() => {
    fetch("/api/members", { headers: authHeaders })
      .then(r => r.json())
      .then((data) => {
        const members = data.members || [];
        if (members.length > 0 && members[0].apiKey) {
          const key = members[0].apiKey;
          setApiKeys([{
            id: 'key-1',
            name: 'Default Key',
            prefix: key.slice(0, 8) + '...' || 'rpk_****...****',
            status: 'Active',
            createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
            lastUsed: new Date().toISOString(),
          }]);
        } else {
          setApiKeys([]);
        }
      })
      .catch(() => {});
  }, [authHeaders]);

  const loadUsageStats = useCallback(() => {
    fetch("/api/scans", { headers: authHeaders })
      .then(r => r.json())
      .then((data) => {
        const scans = data.scans || [];
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthScans = scans.filter((s: { createdAt?: string }) => {
          const d = new Date(s.createdAt || 0);
          return d >= monthStart;
        }).length;
        const totalFindings = scans.reduce((acc: number, s: { findings?: unknown[] }) => acc + (s.findings || []).length, 0);
        setUsageStats({ scansThisMonth: monthScans, totalFindings });
      })
      .catch(() => {});
  }, [authHeaders]);

  useEffect(() => { loadProfile(); loadApiKeys(); loadUsageStats(); }, [loadProfile, loadApiKeys, loadUsageStats]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaved(false); setError("");
    try {
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
    } finally { setSaving(false); }
  };

  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return TABS;
    const q = searchQuery.toLowerCase();
    return TABS.filter(tab =>
      tab.label.toLowerCase().includes(q) ||
      tab.keywords.some(k => k.includes(q))
    );
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim() && filteredTabs.length > 0 && !filteredTabs.find(t => t.id === activeTab)) {
      setActiveTab(filteredTabs[0].id);
    }
  }, [searchQuery, filteredTabs, activeTab]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon"><div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /></div>
          <div><h1>Settings</h1><p>Manage your account and preferences.</p></div>
        </div>
        <div className="grid grid-cols-1 gap-3 max-w-4xl">
          <div className="skeleton-pulse h-12 rounded-xl" />
          <div className="skeleton-pulse h-60 rounded-xl" />
        </div>
      </div>
    );
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="max-w-4xl">
      <div className="page-header">
        <div className="page-header-icon text-neutral-500"><Shield /></div>
        <div><h1>Settings</h1><p>Manage your account and preferences.</p></div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings..."
          className="h-10 pl-10 pr-4 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-700 focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="md:w-56 flex-shrink-0">
          <div className="panel p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible scrollbar-none">
            {filteredTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDanger = tab.id === 'danger-zone';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all w-full text-left ${
                    isDanger && isActive
                      ? 'bg-[#ff3355]/10 text-[#ff3355] border border-[#ff3355]/20'
                      : isDanger
                        ? 'text-neutral-600 hover:text-[#ff3355] hover:bg-white/[0.02]'
                        : isActive
                          ? 'bg-white/[0.08] text-white border border-white/[0.12]'
                          : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 flex-shrink-0 ${isDanger && isActive ? 'text-[#ff3355]' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="space-y-3">
              {/* Profile Header Card */}
              <div className="panel p-6">
                <div className="flex items-center gap-5">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                    {currentUser.initials || (profile.name || profile.email || 'U').split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-white">{profile.name || 'Unnamed User'}</h2>
                    <p className="text-[13px] text-neutral-500 mt-0.5">{profile.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[11px] font-medium text-neutral-400 uppercase tracking-wider">{profile.role || 'Member'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Info + Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="panel p-4">
                  <p className="text-[10px] text-neutral-700 uppercase tracking-[0.1em] mb-1">Organization</p>
                  <p className="text-[14px] font-medium text-neutral-300">ReconPro Default</p>
                </div>
                <div className="panel p-4">
                  <p className="text-[10px] text-neutral-700 uppercase tracking-[0.1em] mb-1">Scans This Month</p>
                  <p className="text-[14px] font-medium text-white font-mono">{usageStats.scansThisMonth}</p>
                </div>
                <div className="panel p-4">
                  <p className="text-[10px] text-neutral-700 uppercase tracking-[0.1em] mb-1">Total Findings</p>
                  <p className="text-[14px] font-medium text-white font-mono">{usageStats.totalFindings}</p>
                </div>
              </div>

              {/* Edit Profile Form */}
              <div className="panel p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <User className="h-4 w-4 text-neutral-600" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium text-white">Edit Profile</h3>
                    <p className="text-[11px] text-neutral-600">Update your personal information</p>
                  </div>
                </div>
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
              </div>
            </div>
          )}

          {/* API KEYS TAB */}
          {activeTab === "api-keys" && (
            <div className="panel p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <Key className="h-4 w-4 text-neutral-600" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium text-white">API Keys</h3>
                    <p className="text-[11px] text-neutral-600">Manage programmatic access</p>
                  </div>
                </div>
                <Button type="button" variant="outline" disabled
                  className="border-white/[0.06] bg-transparent text-neutral-600 font-medium cursor-not-allowed rounded-lg h-9 text-[12px]"
                  title="API key generation is not yet available">
                  Generate New Key
                </Button>
              </div>
              {apiKeys.length === 0 ? (
                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-6 text-center">
                  <Key className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
                  <p className="text-[13px] font-medium text-neutral-400">No API keys</p>
                  <p className="text-[11px] text-neutral-600 mt-1">Generate a key to enable programmatic access to the ReconPro API.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-neutral-300">{key.name}</p>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#00ff88]/10 text-[#00ff88]">{key.status}</span>
                        </div>
                        <p className="text-[11px] text-neutral-600 font-mono mt-1">{key.prefix}</p>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-neutral-600">
                        <span>Created: {formatDate(key.createdAt)}</span>
                        <span>Last used: {timeAgo(key.lastUsed)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="panel p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                  <Bell className="h-4 w-4 text-neutral-600" />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-white">Notifications</h3>
                  <p className="text-[11px] text-neutral-600">Configure how you receive alerts and updates</p>
                </div>
              </div>
              <div>
                <ToggleRow label="Email Notifications" description="Receive critical alerts and updates via email" checked={emailNotifications} onChange={setEmailNotifications} />
                <ToggleRow label="Scan Alerts" description="Get notified when scans finish running" checked={scanAlerts} onChange={setScanAlerts} />
                <ToggleRow label="Critical Alerts" description="Immediate alerts for high-severity discoveries" checked={criticalAlerts} onChange={setCriticalAlerts} />
                <ToggleRow label="Weekly Digest" description="Summary report delivered every Monday" checked={weeklyDigest} onChange={setWeeklyDigest} />
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5 pr-4">
                    <p className="text-[13px] font-medium text-neutral-300">Slack Notifications</p>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">Push notifications to your Slack workspace</p>
                  </div>
                  <Switch
                    checked={slackNotifications}
                    onCheckedChange={setSlackNotifications}
                    className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="space-y-3">
              {/* 2FA */}
              <div className="panel p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <Shield className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-medium text-white">Two-Factor Authentication</h3>
                      <p className="text-[11px] text-neutral-600">Add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled
                    className="border-white/[0.06] bg-transparent text-neutral-600 cursor-not-allowed rounded-lg h-8 text-[12px]">
                    Coming Soon
                  </Button>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="panel p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <Eye className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-medium text-white">Active Sessions</h3>
                      <p className="text-[11px] text-neutral-600">Manage your active login sessions across devices</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled
                    className="border-white/[0.06] bg-transparent text-neutral-600 cursor-not-allowed rounded-lg h-8 text-[12px]">
                    Coming Soon
                  </Button>
                </div>
              </div>

              {/* Change Password */}
              <div className="panel p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <Key className="h-4 w-4 text-neutral-600" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium text-white">Change Password</h3>
                    <p className="text-[11px] text-neutral-600">Update your account password</p>
                  </div>
                </div>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); }}>
                  <div className="space-y-1.5">
                    <Label htmlFor="current-pw" className="text-neutral-600 text-[11px] tracking-wide uppercase">Current Password</Label>
                    <div className="relative">
                      <Input id="current-pw" type={showPasswords ? 'text' : 'password'} value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password"
                        className="h-10 pr-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-700 focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]" />
                      <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400">
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw" className="text-neutral-600 text-[11px] tracking-wide uppercase">New Password</Label>
                    <Input id="new-pw" type={showPasswords ? 'text' : 'password'} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password"
                      className="h-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-700 focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-pw" className="text-neutral-600 text-[11px] tracking-wide uppercase">Confirm New Password</Label>
                    <Input id="confirm-pw" type={showPasswords ? 'text' : 'password'} value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password"
                      className="h-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-700 focus-visible:border-white/[0.15] focus-visible:ring-0 rounded-lg text-[13px]" />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[11px] text-[#ff3355] mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <Button type="submit" disabled
                    className="bg-white text-black hover:bg-white/90 font-medium rounded-lg h-10 px-5 text-[13px] disabled:opacity-40 cursor-not-allowed">
                    Update Password
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* DANGER ZONE TAB */}
          {activeTab === "danger-zone" && (
            <div className="panel p-6 border-[#ff3355]/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#ff3355]/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-[#ff3355]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-[#ff3355]">Danger Zone</h3>
                  <p className="text-[11px] text-neutral-600">Irreversible and destructive actions</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-[13px] font-medium text-neutral-300">Delete Account</h4>
                    <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <Button type="button" disabled
                    className="bg-[#ff3355] text-white hover:bg-[#ff3355]/90 font-medium rounded-lg h-9 px-4 text-[12px] disabled:opacity-40 cursor-not-allowed flex items-center gap-2 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}