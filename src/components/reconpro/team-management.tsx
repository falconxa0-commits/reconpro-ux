'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Shield,
  Eye,
  Search,
  MoreHorizontal,
  Mail,
  Edit3,
  Trash2,
  Crown,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthHeaders } from '@/hooks/use-auth-headers';

// ── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Security Lead' | 'Analyst' | 'Viewer';
  avatar?: string;
  lastActive: string;
  teamMemberships: string[];
  status: 'online' | 'offline' | 'away';
}

interface Team {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'Admin':
      return 'bg-[rgba(168,85,247,0.15)] text-[#666666] border-[rgba(168,85,247,0.3)]';
    case 'Security Lead':
      return 'bg-[rgba(0,255,136,0.15)] text-[#00ff88] border-[rgba(0,255,136,0.3)]';
    case 'Analyst':
      return 'bg-[rgba(88,166,255,0.15)] text-[#44aaff] border-[rgba(88,166,255,0.3)]';
    case 'Viewer':
      return 'bg-[rgba(139,148,158,0.15)] text-[#444444] border-[rgba(139,148,158,0.3)]';
    default:
      return 'bg-[rgba(139,148,158,0.15)] text-[#444444] border-[rgba(139,148,158,0.3)]';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-[#00ff88]';
    case 'away':
      return 'bg-[#d29922]';
    case 'offline':
      return 'bg-neutral-800';
    default:
      return 'bg-neutral-800';
  }
}

function getAvatarBg(name: string): string {
  const colors = [
    'rgba(0,255,136,0.15)',
    'rgba(88,166,255,0.15)',
    'rgba(168,85,247,0.15)',
    'rgba(255,51,85,0.15)',
    'rgba(210,153,34,0.15)',
    'rgba(121,192,255,0.15)',
    'rgba(255,123,114,0.15)',
    'rgba(187,128,220,0.15)',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function getAvatarTextColor(name: string): string {
  const colors = ['#00ff88', '#44aaff', '#666666', '#ff3355', '#d29922', '#44aaff', '#ff6677', '#6b7280'];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

// ── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const cardHover = {
  scale: 1.02,
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
};

// ── Component ───────────────────────────────────────────────────────────────

export function TeamManagement() {
  const authHeaders = useAuthHeaders();
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Team add dialog
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');

  // Role edit dialog
  const [roleEditOpen, setRoleEditOpen] = useState(false);
  const [roleEditId, setRoleEditId] = useState('');
  const [roleEditValue, setRoleEditValue] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/members', { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMembers(json.members || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError('Failed to load team data. Please try again.');
    }
  }, [authHeaders]);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams', { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTeams(json.teams || []);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError('Failed to load team data. Please try again.');
    }
  }, [authHeaders]);

  const fetchAllRef = useCallback(async () => {
    setError('');
    await Promise.all([fetchMembers(), fetchTeams()]);
  }, [fetchMembers, fetchTeams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchAllRef();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchAllRef]);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = members.filter((m) => m.role === 'Admin').length;
  const onlineCount = members.filter((m) => m.status === 'online').length;

  const handleInvite = async () => {
    if (!inviteName || !inviteEmail) return;
    try {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ name: inviteName, email: inviteEmail, role: inviteRole.toLowerCase().replace(' ', '_') }),
      });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('Viewer');
      await fetchMembers();
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const handleRoleChange = async () => {
    if (!roleEditId || !roleEditValue) return;
    try {
      await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ id: roleEditId, role: roleEditValue.toLowerCase().replace(' ', '_') }),
      });
      setRoleEditOpen(false);
      await fetchMembers();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
      await fetchMembers();
    } catch (err) {
      console.error('Failed to delete member:', err);
    }
  };

  const handleAddTeam = async () => {
    if (!teamName) return;
    try {
      await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ name: teamName, description: teamDesc }),
      });
      setTeamOpen(false);
      setTeamName('');
      setTeamDesc('');
      await fetchTeams();
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    try {
      await fetch(`/api/teams?id=${id}`, { method: 'DELETE' });
      await fetchTeams();
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openRoleEdit = (member: Member) => {
    setRoleEditId(member.id);
    setRoleEditValue(member.role);
    setRoleEditOpen(true);
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <p className="text-[#444444]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-3 py-20">
        <AlertCircle className="h-8 w-8 text-[#ff3355]" />
        <p className="text-sm text-[#ff3355]">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchAllRef} className="border-white/[0.08] text-white hover:bg-white/[0.05]">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-6"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)]">
            <Users className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Team Management</h2>
            <p className="text-sm text-[#444444]">Manage members, roles, and team assignments</p>
          </div>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white hover:bg-white/90 text-black font-semibold gap-2">
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-white/[0.06] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Invite New Member</DialogTitle>
              <DialogDescription className="text-[#444444]">
                Send an invitation to add a new team member.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Name</label>
                <Input
                  placeholder="John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="bg-[#0a0a0a] border-white/[0.06] text-white placeholder:text-[#333333] focus:border-white/[0.15]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Email Address</label>
                <Input
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-[#0a0a0a] border-white/[0.06] text-white placeholder:text-[#333333] focus:border-white/[0.15]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Admin', 'Security Lead', 'Analyst', 'Viewer'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        inviteRole === r
                          ? 'bg-[rgba(0,255,136,0.15)] border-[rgba(0,255,136,0.4)] text-[#00ff88]'
                          : 'bg-[#0a0a0a] border-white/[0.06] text-[#444444] hover:border-white/[0.08]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)} className="border-white/[0.06] text-[#444444] hover:bg-[#0a0a0a]">
                Cancel
              </Button>
              <Button onClick={handleInvite} className="bg-white hover:bg-white/90 text-black font-semibold">
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: members.length, icon: Users, color: '#00ff88' },
          { label: 'Active Teams', value: teams.length, icon: Shield, color: '#44aaff' },
          { label: 'Pending Invites', value: 0, icon: AlertCircle, color: '#d29922' },
          { label: 'Admins', value: adminCount, icon: Crown, color: '#666666' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={cardHover}
            className="rounded-xl border border-white/[0.06] bg-black p-4 transition-shadow hover:shadow-lg"
            style={{ boxShadow: '0 0 0px transparent' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#444444] uppercase tracking-wider">{stat.label}</span>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-black border border-white/[0.06]">
            <TabsTrigger
              value="members"
              className="data-[state=active]:bg-[rgba(0,255,136,0.1)] data-[state=active]:text-[#00ff88] text-[#444444]"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Members
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="data-[state=active]:bg-[rgba(0,255,136,0.1)] data-[state=active]:text-[#00ff88] text-[#444444]"
            >
              <Shield className="w-4 h-4 mr-1.5" />
              Teams
            </TabsTrigger>
          </TabsList>

          {/* ── Members Tab ─────────────────────────────────────────────── */}
          <TabsContent value="members" className="mt-4">
            <motion.div
              className="rounded-xl border border-white/[0.06] bg-black overflow-hidden"
            >
              {/* Search bar */}
              <div className="p-4 border-b border-white/[0.06]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#333333]" />
                  <Input
                    placeholder="Search members by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-[#0a0a0a] border-white/[0.06] text-white placeholder:text-[#333333] focus:border-white/[0.15] h-9"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="max-h-[400px] overflow-y-auto">
                {members.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Users className="w-8 h-8 text-[#333333] mx-auto mb-3" />
                    <p className="text-sm text-[#444444]">No members yet. Click &quot;Invite Member&quot; to add your first team member.</p>
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-[#444444] font-medium text-xs uppercase tracking-wider">Member</TableHead>
                      <TableHead className="text-[#444444] font-medium text-xs uppercase tracking-wider">Role</TableHead>
                      <TableHead className="text-[#444444] font-medium text-xs uppercase tracking-wider hidden md:table-cell">Last Active</TableHead>
                      <TableHead className="text-[#444444] font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Status</TableHead>
                      <TableHead className="text-[#444444] font-medium text-xs uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredMembers.map((member, idx) => (
                        <motion.tr
                          key={member.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.3 }}
                          className="border-b border-white/[0.06] hover:bg-[rgba(0,255,136,0.03)] transition-colors"
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                  style={{
                                    backgroundColor: getAvatarBg(member.name),
                                    color: getAvatarTextColor(member.name),
                                  }}
                                >
                                  {getInitials(member.name)}
                                </div>
                                <div
                                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${getStatusColor(member.status)}`}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{member.name}</p>
                                <p className="text-xs text-[#444444] truncate">{member.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}
                            >
                              {member.role === 'Admin' && <Crown className="w-3 h-3 mr-1" />}
                              {member.role === 'Security Lead' && <Shield className="w-3 h-3 mr-1" />}
                              {member.role === 'Analyst' && <Search className="w-3 h-3 mr-1" />}
                              {member.role === 'Viewer' && <Eye className="w-3 h-3 mr-1" />}
                              {member.role}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 hidden md:table-cell">
                            <div className="flex items-center gap-1.5 text-[#444444]">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-xs">{member.lastActive}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`} />
                              <span className="text-xs text-[#444444] capitalize">{member.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#444444] hover:text-white hover:bg-[rgba(0,255,136,0.1)]">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-[#000000] border-white/[0.06] text-white min-w-[160px]" align="end">
                                <DropdownMenuItem
                                  className="text-[#444444] hover:text-white hover:bg-[rgba(0,255,136,0.1)] cursor-pointer gap-2"
                                  onClick={() => openRoleEdit(member)}
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Edit Role
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-[#444444] hover:text-white hover:bg-[rgba(0,255,136,0.1)] cursor-pointer gap-2">
                                  <Mail className="w-4 h-4" />
                                  Send Message
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-[#444444] hover:text-white hover:bg-[rgba(0,255,136,0.1)] cursor-pointer gap-2"
                                  onClick={() => handleCopyId(member.id)}
                                >
                                  {copiedId === member.id ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4" />}
                                  {copiedId === member.id ? 'Copied!' : 'Copy ID'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/[0.06]" />
                                <DropdownMenuItem
                                  className="text-[#ff3355] hover:text-[#ff3355] hover:bg-[rgba(255,51,85,0.1)] cursor-pointer gap-2"
                                  onClick={() => handleDeleteMember(member.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
                )}
              </div>

              {/* Table footer */}
              <div className="p-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#444444]">
                <span>{filteredMembers.length} of {members.length} members</span>
                <span>{onlineCount} currently online</span>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Teams Tab ───────────────────────────────────────────────── */}
          <TabsContent value="teams" className="mt-4">
            <div className="flex justify-end mb-4">
              <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white hover:bg-white/90 text-black font-semibold gap-2">
                    <Plus className="w-4 h-4" />
                    Add Team
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-white/[0.06] text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New Team</DialogTitle>
                    <DialogDescription className="text-[#444444]">
                      Add a new team to your organization.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Team Name</label>
                      <Input
                        placeholder="e.g. Red Team"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="bg-[#0a0a0a] border-white/[0.06] text-white placeholder:text-[#333333] focus:border-white/[0.15]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Description</label>
                      <Input
                        placeholder="e.g. Offensive security operations"
                        value={teamDesc}
                        onChange={(e) => setTeamDesc(e.target.value)}
                        className="bg-[#0a0a0a] border-white/[0.06] text-white placeholder:text-[#333333] focus:border-white/[0.15]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTeamOpen(false)} className="border-white/[0.06] text-[#444444] hover:bg-[#0a0a0a]">
                      Cancel
                    </Button>
                    <Button onClick={handleAddTeam} className="bg-white hover:bg-white/90 text-black font-semibold">
                      Create Team
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {teams.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-black p-8 text-center">
                <Shield className="w-8 h-8 text-[#333333] mx-auto mb-3" />
                <p className="text-sm text-[#444444]">No teams yet. Click &quot;Add Team&quot; to create your first team.</p>
              </div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" variants={containerVariants} initial="hidden" animate="visible">
                {teams.map((team, idx) => (
                  <motion.div
                    key={team.id}
                    variants={itemVariants}
                    whileHover={cardHover}
                    className="rounded-xl border overflow-hidden transition-shadow relative"
                    style={{
                      borderColor: team.color + '30',
                      backgroundColor: '#000000',
                    }}
                  >
                    {/* Color accent top border */}
                    <div className="h-1" style={{ backgroundColor: team.color }} />

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: team.color + '15' }}
                          >
                            <Shield className="w-5 h-5" style={{ color: team.color }} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{team.name}</h3>
                            <p className="text-xs text-[#444444]">{team.memberCount} members</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-white/[0.06] text-[#444444]"
                          >
                            Active
                          </Badge>
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="p-1.5 rounded-md border border-white/[0.06] text-[#444444] hover:text-[#ff3355] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all"
                            title="Delete team"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#444444] mb-4 leading-relaxed">{team.description || 'No description'}</p>

                      {/* Member avatars stack */}
                      <div className="flex items-center">
                        <div className="flex -space-x-2">
                          {members
                            .filter((m) => m.teamMemberships.includes(team.name))
                            .slice(0, 5)
                            .map((member) => (
                              <div
                                key={member.id}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-black shrink-0"
                                style={{
                                  backgroundColor: getAvatarBg(member.name),
                                  color: getAvatarTextColor(member.name),
                                }}
                                title={member.name}
                              >
                                {getInitials(member.name)}
                              </div>
                            ))}
                        </div>
                        {members.filter((m) => m.teamMemberships.includes(team.name)).length > 5 && (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-black bg-[#000000] text-[#444444] -ml-2 shrink-0">
                            +{members.filter((m) => m.teamMemberships.includes(team.name)).length - 5}
                          </div>
                        )}
                        <span className="ml-3 text-xs text-[#333333]">
                          {members.filter((m) => m.teamMemberships.includes(team.name)).length > 1
                            ? `${members.filter((m) => m.teamMemberships.includes(team.name)).length} members`
                            : `${members.filter((m) => m.teamMemberships.includes(team.name)).length} member`}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Role Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={roleEditOpen} onOpenChange={setRoleEditOpen}>
        <DialogContent className="bg-black border-white/[0.06] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Member Role</DialogTitle>
            <DialogDescription className="text-[#444444]">
              Change the role for this team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {['Admin', 'Security Lead', 'Analyst', 'Viewer'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleEditValue(r)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      roleEditValue === r
                        ? 'bg-[rgba(0,255,136,0.15)] border-[rgba(0,255,136,0.4)] text-[#00ff88]'
                        : 'bg-[#0a0a0a] border-white/[0.06] text-[#444444] hover:border-white/[0.08]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleEditOpen(false)} className="border-white/[0.06] text-[#444444] hover:bg-[#0a0a0a]">
              Cancel
            </Button>
            <Button onClick={handleRoleChange} className="bg-white hover:bg-white/90 text-black font-semibold">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
