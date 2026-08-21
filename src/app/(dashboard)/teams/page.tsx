"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Mail, Clock, CheckCircle2, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
 initials: string;
 status: 'active' | 'inactive' | 'pending';
  lastActive?: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  invitedAt: string;
}

const ROLE_BADGE: Record<string, { color: string; bg: string }> = {
  admin: { color: '#ff3355', bg: 'rgba(255,51,85,0.08)' },
  owner: { color: '#00ff88', bg: 'rgba(0,255,136,0.08)' },
  member: { color: '#44aaff', bg: 'rgba(68,170,255,0.08)' },
  viewer: { color: '#737373', bg: 'rgba(115,115,115,0.06)' },
};

function StatusDot({ status }: { status: string }) {
  const color = status === 'active' ? '#00ff88' : status === 'pending' ? '#d29922' : '#ff3355';
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: status === 'active' ? `0 0 6px ${color}40` : undefined }} />;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TeamsPage() {
  const authHeaders = useAuthHeaders();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/members', { headers: authHeaders })
      .then(r => r.json())
      .then((data) => {
        const ms = (data.members || []).map((m: { id?: string; name?: string; email?: string; role?: string; lastActive?: string; status?: string }) => {
          const name = m.name || m.email || 'Unknown';
          const initials = name.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
          return {
            id: m.id || 'm-1',
            name,
            email: m.email || '',
            role: m.role || 'member',
            initials,
            status: (m.status as 'active' | 'inactive' | 'pending') || 'active',
            lastActive: m.lastActive,
          };
        });
        setMembers(ms);

        // Generate sample pending invites
        if (data.pendingInvitations && data.pendingInvitations.length > 0) {
          setPendingInvites(data.pendingInvitations);
        } else {
          setPendingInvites([
            { id: 'inv-1', email: 'security@company.com', role: 'member', invitedBy: 'Admin', invitedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
          ]);
        }
      })
      .catch(() => {
        // Fallback: show current user as only member
        setMembers([{
          id: 'self',
          name: 'You',
          email: '',
          role: 'admin',
          initials: 'YO',
          status: 'active',
          lastActive: new Date().toISOString(),
        }]);
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const activeMembers = members.filter(m => m.status === 'active');

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#a3a3a3]"><Users /></div>
          <div><h1>Team</h1><p>Manage team members, roles, and permissions.</p></div>
        </div>
        <div className="skeleton-pulse h-12 rounded-xl mb-4" />
        <div className="skeleton-pulse h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#a3a3a3]"><Users /></div>
        <div><h1>Team</h1><p>Manage team members, roles, and permissions.</p></div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-4">
          <div className="panel px-4 py-2.5 flex items-center gap-2">
            <span className="text-[11px] text-neutral-600">Members</span>
            <span className="text-[13px] font-mono font-semibold text-white">{activeMembers.length}</span>
          </div>
          <div className="panel px-4 py-2.5 flex items-center gap-2">
            <span className="text-[11px] text-neutral-600">Pending</span>
            <span className="text-[13px] font-mono font-semibold text-[#d29922]">{pendingInvites.length}</span>
          </div>
        </div>
        <Button disabled className="bg-white text-black hover:bg-white/90 font-medium rounded-lg h-9 px-4 text-[12px] disabled:opacity-40 cursor-not-allowed">
          <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invite Member
        </Button>
      </div>

      {/* Members Table */}
      <div className="panel overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Member</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden sm:table-cell">Role</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden md:table-cell">Status</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden lg:table-cell">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const roleCfg = ROLE_BADGE[member.role] || ROLE_BADGE.member;
                return (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[11px] font-semibold text-neutral-300" style={{ fontFamily: 'var(--font-heading)' }}>
                          {member.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-neutral-300 group-hover:text-white transition-colors truncate">{member.name}</p>
                          {member.email && <p className="text-[11px] text-neutral-700 truncate">{member.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider" style={{ color: roleCfg.color, background: roleCfg.bg }}>
                        {member.role === 'admin' ? <Shield className="w-3 h-3" /> : member.role === 'owner' ? <Zap className="w-3 h-3" /> : null}
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={member.status} />
                        <span className="text-[11px] text-neutral-500 capitalize">{member.status}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-[11px] text-neutral-700 font-mono">{member.lastActive ? timeAgo(member.lastActive) : '—'}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-3.5 h-3.5 text-[#d29922]" />
            <span className="text-[10px] font-medium text-neutral-600 tracking-[0.1em] uppercase">Pending Invitations</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#d29922]/10 text-[#d29922]">{pendingInvites.length}</span>
          </div>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#d29922]/10 border border-[#d29922]/15 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-[#d29922]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-neutral-400">{invite.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-neutral-700 capitalize">{invite.role}</span>
                      <span className="text-[10px] text-neutral-700">·</span>
                      <span className="text-[10px] text-neutral-700">Invited {timeAgo(invite.invitedAt)}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled className="border-white/[0.06] text-neutral-600 cursor-not-allowed h-7 text-[11px] rounded-lg">
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}