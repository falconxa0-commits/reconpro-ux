'use client';

import { useState } from 'react';
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
  Activity,
  Clock,
  AlertCircle,
  Copy,
  X,
  Check,
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

interface TeamManagementProps {
  members?: Member[];
  teams?: Team[];
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const mockMembers: Member[] = [
  {
    id: 'm1',
    name: 'Marcus Chen',
    email: 'marcus.chen@reconpro.io',
    role: 'Admin',
    lastActive: '2 min ago',
    teamMemberships: ['Red Team', 'Engineering'],
    status: 'online',
  },
  {
    id: 'm2',
    name: 'Sarah Nakamura',
    email: 'sarah.n@reconpro.io',
    role: 'Security Lead',
    lastActive: '5 min ago',
    teamMemberships: ['Blue Team'],
    status: 'online',
  },
  {
    id: 'm3',
    name: 'James Rodriguez',
    email: 'j.rodriguez@reconpro.io',
    role: 'Analyst',
    lastActive: '12 min ago',
    teamMemberships: ['Red Team', 'Compliance'],
    status: 'online',
  },
  {
    id: 'm4',
    name: 'Elena Petrova',
    email: 'elena.p@reconpro.io',
    role: 'Analyst',
    lastActive: '1h ago',
    teamMemberships: ['Compliance'],
    status: 'away',
  },
  {
    id: 'm5',
    name: 'David Okonkwo',
    email: 'd.okonkwo@reconpro.io',
    role: 'Security Lead',
    lastActive: '30 min ago',
    teamMemberships: ['Engineering'],
    status: 'online',
  },
  {
    id: 'm6',
    name: 'Aisha Patel',
    email: 'aisha.p@reconpro.io',
    role: 'Viewer',
    lastActive: '3h ago',
    teamMemberships: ['Compliance'],
    status: 'offline',
  },
  {
    id: 'm7',
    name: 'Liam Foster',
    email: 'l.foster@reconpro.io',
    role: 'Admin',
    lastActive: '8 min ago',
    teamMemberships: ['Red Team', 'Blue Team', 'Engineering'],
    status: 'online',
  },
  {
    id: 'm8',
    name: 'Mei-Ling Wu',
    email: 'meiling.wu@reconpro.io',
    role: 'Analyst',
    lastActive: '45 min ago',
    teamMemberships: ['Blue Team'],
    status: 'offline',
  },
];

const mockTeams: Team[] = [
  {
    id: 't1',
    name: 'Red Team',
    description: 'Offensive security operations and penetration testing',
    color: '#f85149',
    memberCount: 4,
  },
  {
    id: 't2',
    name: 'Blue Team',
    description: 'Defensive security monitoring and incident response',
    color: '#58a6ff',
    memberCount: 3,
  },
  {
    id: 't3',
    name: 'Compliance',
    description: 'Regulatory compliance auditing and governance',
    color: '#d29922',
    memberCount: 3,
  },
  {
    id: 't4',
    name: 'Engineering',
    description: 'Platform engineering and security tooling development',
    color: '#00ff88',
    memberCount: 3,
  },
];

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
      return 'bg-[rgba(168,85,247,0.15)] text-[#a855f7] border-[rgba(168,85,247,0.3)]';
    case 'Security Lead':
      return 'bg-[rgba(0,255,136,0.15)] text-[#00ff88] border-[rgba(0,255,136,0.3)]';
    case 'Analyst':
      return 'bg-[rgba(88,166,255,0.15)] text-[#58a6ff] border-[rgba(88,166,255,0.3)]';
    case 'Viewer':
      return 'bg-[rgba(139,148,158,0.15)] text-[#8b949e] border-[rgba(139,148,158,0.3)]';
    default:
      return 'bg-[rgba(139,148,158,0.15)] text-[#8b949e] border-[rgba(139,148,158,0.3)]';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-[#00ff88]';
    case 'away':
      return 'bg-[#d29922]';
    case 'offline':
      return 'bg-[#484f58]';
    default:
      return 'bg-[#484f58]';
  }
}

function getAvatarBg(name: string): string {
  const colors = [
    'rgba(0,255,136,0.15)',
    'rgba(88,166,255,0.15)',
    'rgba(168,85,247,0.15)',
    'rgba(248,81,73,0.15)',
    'rgba(210,153,34,0.15)',
    'rgba(121,192,255,0.15)',
    'rgba(255,123,114,0.15)',
    'rgba(187,128,220,0.15)',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function getAvatarTextColor(name: string): string {
  const colors = ['#00ff88', '#58a6ff', '#a855f7', '#f85149', '#d29922', '#79c0ff', '#ff7b72', '#bb80d4'];
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const cardHover = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};

// ── Component ───────────────────────────────────────────────────────────────

export function TeamManagement({ members = mockMembers, teams = mockTeams }: TeamManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = members.filter((m) => m.role === 'Admin').length;
  const onlineCount = members.filter((m) => m.status === 'online').length;

  const handleInvite = () => {
    console.log('Invite member:', { email: inviteEmail, role: inviteRole });
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('Viewer');
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
            <h2 className="text-xl font-bold text-[#e6edf3]">Team Management</h2>
            <p className="text-sm text-[#8b949e]">Manage members, roles, and team assignments</p>
          </div>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0d14] font-semibold gap-2">
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0d1117] border-[#21262d] text-[#e6edf3]">
            <DialogHeader>
              <DialogTitle className="text-[#e6edf3]">Invite New Member</DialogTitle>
              <DialogDescription className="text-[#8b949e]">
                Send an invitation to add a new team member.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e6edf3]">Email Address</label>
                <Input
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-[#0a0d14] border-[#21262d] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#00ff88]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e6edf3]">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Admin', 'Security Lead', 'Analyst', 'Viewer'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        inviteRole === r
                          ? 'bg-[rgba(0,255,136,0.15)] border-[rgba(0,255,136,0.4)] text-[#00ff88]'
                          : 'bg-[#0a0d14] border-[#21262d] text-[#8b949e] hover:border-[#30363d]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)} className="border-[#21262d] text-[#8b949e] hover:bg-[#0a0d14]">
                Cancel
              </Button>
              <Button onClick={handleInvite} className="bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0d14] font-semibold">
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
          { label: 'Active Teams', value: teams.length, icon: Shield, color: '#58a6ff' },
          { label: 'Pending Invites', value: 3, icon: AlertCircle, color: '#d29922' },
          { label: 'Admins', value: adminCount, icon: Crown, color: '#a855f7' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={cardHover}
            className="rounded-xl border border-[#21262d] bg-[#0d1117] p-4 transition-shadow hover:shadow-lg"
            style={{ boxShadow: '0 0 0px transparent' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">{stat.label}</span>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-[#e6edf3]">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-[#0d1117] border border-[#21262d]">
            <TabsTrigger
              value="members"
              className="data-[state=active]:bg-[rgba(0,255,136,0.1)] data-[state=active]:text-[#00ff88] text-[#8b949e]"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Members
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="data-[state=active]:bg-[rgba(0,255,136,0.1)] data-[state=active]:text-[#00ff88] text-[#8b949e]"
            >
              <Shield className="w-4 h-4 mr-1.5" />
              Teams
            </TabsTrigger>
          </TabsList>

          {/* ── Members Tab ─────────────────────────────────────────────── */}
          <TabsContent value="members" className="mt-4">
            <motion.div
              className="rounded-xl border border-[#21262d] bg-[#0d1117] overflow-hidden"
            >
              {/* Search bar */}
              <div className="p-4 border-b border-[#21262d]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
                  <Input
                    placeholder="Search members by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-[#0a0d14] border-[#21262d] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#00ff88] h-9"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#21262d] hover:bg-transparent">
                      <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider">Member</TableHead>
                      <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider">Role</TableHead>
                      <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider hidden md:table-cell">Last Active</TableHead>
                      <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Status</TableHead>
                      <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider text-right">Actions</TableHead>
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
                          className="border-b border-[#161b22] hover:bg-[rgba(0,255,136,0.03)] transition-colors"
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
                                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1117] ${getStatusColor(member.status)}`}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#e6edf3] truncate">{member.name}</p>
                                <p className="text-xs text-[#8b949e] truncate">{member.email}</p>
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
                            <div className="flex items-center gap-1.5 text-[#8b949e]">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-xs">{member.lastActive}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`} />
                              <span className="text-xs text-[#8b949e] capitalize">{member.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[rgba(0,255,136,0.1)]">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-[#161b22] border-[#21262d] text-[#e6edf3] min-w-[160px]" align="end">
                                <DropdownMenuItem className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[rgba(0,255,136,0.1)] cursor-pointer gap-2">
                                  <Edit3 className="w-4 h-4" />
                                  Edit Role
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[rgba(0,255,136,0.1)] cursor-pointer gap-2">
                                  <Mail className="w-4 h-4" />
                                  Send Message
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[rgba(0,255,136,0.1)] cursor-pointer gap-2"
                                  onClick={() => handleCopyId(member.id)}
                                >
                                  {copiedId === member.id ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4" />}
                                  {copiedId === member.id ? 'Copied!' : 'Copy ID'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[#21262d]" />
                                <DropdownMenuItem className="text-[#f85149] hover:text-[#f85149] hover:bg-[rgba(248,81,73,0.1)] cursor-pointer gap-2">
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
              </div>

              {/* Table footer */}
              <div className="p-3 border-t border-[#21262d] flex items-center justify-between text-xs text-[#8b949e]">
                <span>{filteredMembers.length} of {members.length} members</span>
                <span>{onlineCount} currently online</span>
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Teams Tab ───────────────────────────────────────────────── */}
          <TabsContent value="teams" className="mt-4">
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" variants={containerVariants} initial="hidden" animate="visible">
              {teams.map((team, idx) => (
                <motion.div
                  key={team.id}
                  variants={itemVariants}
                  whileHover={cardHover}
                  className="rounded-xl border overflow-hidden transition-shadow"
                  style={{
                    borderColor: team.color + '30',
                    backgroundColor: '#0d1117',
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
                          <h3 className="text-sm font-bold text-[#e6edf3]">{team.name}</h3>
                          <p className="text-xs text-[#8b949e]">{team.memberCount} members</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-[#21262d] text-[#8b949e]"
                      >
                        Active
                      </Badge>
                    </div>

                    <p className="text-xs text-[#8b949e] mb-4 leading-relaxed">{team.description}</p>

                    {/* Member avatars stack */}
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {members
                          .filter((m) => m.teamMemberships.includes(team.name))
                          .slice(0, 5)
                          .map((member) => (
                            <div
                              key={member.id}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#0d1117] shrink-0"
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
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-[#0d1117] bg-[#161b22] text-[#8b949e] -ml-2 shrink-0">
                          +{members.filter((m) => m.teamMemberships.includes(team.name)).length - 5}
                        </div>
                      )}
                      <span className="ml-3 text-xs text-[#484f58]">
                        {members.filter((m) => m.teamMemberships.includes(team.name)).length > 1
                          ? `${members.filter((m) => m.teamMemberships.includes(team.name)).length} members`
                          : `${members.filter((m) => m.teamMemberships.includes(team.name)).length} member`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
