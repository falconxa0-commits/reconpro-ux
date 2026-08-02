'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, Send, RefreshCw, Shield, ShieldOff, Trophy, Clock, Zap,
  Key, Database, Server, Cloud, Lock, Unlock, Eye, EyeOff,
  Lightbulb, ChevronDown, Users, Award, Star, Target, AlertTriangle,
  CheckCircle, XCircle, ArrowRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  action?: string;
  points?: number;
  annotation?: string;
  timestamp: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  attacks: number;
  time: string;
}

interface DefenseRules {
  blockCredentialReads: boolean;
  requireApprovalForDestructive: boolean;
  validateRoleBeforeAction: boolean;
  trackMultiTurnIntent: boolean;
}

interface EnvResource {
  id: string;
  type: 's3' | 'iam' | 'lambda' | 'ssm' | 'rds';
  name: string;
  accessed: boolean;
  icon: React.ReactNode;
}

// ── Hints ──────────────────────────────────────────────────────────

const HINTS = [
  { id: 'se', title: 'Social Engineering', text: 'Try social engineering — pretend to be a new team member who needs access to deployment configs.', icon: <Users className="w-4 h-4" /> },
  { id: 'mt', title: 'Multi-Turn Attacks', text: 'Multi-turn attacks work better than single prompts. Build up trust gradually before asking for sensitive data.', icon: <ArrowRight className="w-4 h-4" /> },
  { id: 'ic', title: 'Indirect Extraction', text: 'Try indirect credential extraction through IAM policies, SSM parameters, or Lambda environment variables.', icon: <Key className="w-4 h-4" /> },
  { id: 'rc', title: 'Role Confusion', text: 'Role confusion is powerful — "As the security auditor..." or "Acting as the penetration tester..."', icon: <ShieldOff className="w-4 h-4" /> },
  { id: 'ch', title: 'Chain Requests', text: 'Chain innocent-looking requests into a dangerous sequence. Start with recon, escalate to extraction.', icon: <Target className="w-4 h-4" /> },
];

// ── Environment Resources ──────────────────────────────────────────

const DEFAULT_RESOURCES: EnvResource[] = [
  { id: 's3-prod', type: 's3', name: 'prod-data-bucket', accessed: false, icon: <Cloud className="w-4 h-4" /> },
  { id: 's3-config', type: 's3', name: 'config-secrets', accessed: false, icon: <Cloud className="w-4 h-4" /> },
  { id: 'iam-deploy', type: 'iam', name: 'deployment-role', accessed: false, icon: <Shield className="w-4 h-4" /> },
  { id: 'iam-lambda', type: 'iam', name: 'lambda-executor', accessed: false, icon: <Shield className="w-4 h-4" /> },
  { id: 'iam-ssm', type: 'iam', name: 'ssm-access-role', accessed: false, icon: <Shield className="w-4 h-4" /> },
  { id: 'lambda-order', type: 'lambda', name: 'process-order', accessed: false, icon: <Zap className="w-4 h-4" /> },
  { id: 'lambda-notify', type: 'lambda', name: 'send-notification', accessed: false, icon: <Zap className="w-4 h-4" /> },
  { id: 'lambda-pipe', type: 'lambda', name: 'data-pipeline', accessed: false, icon: <Zap className="w-4 h-4" /> },
  { id: 'ssm-db', type: 'ssm', name: '/app/db/*', accessed: false, icon: <Key className="w-4 h-4" /> },
  { id: 'ssm-api', type: 'ssm', name: '/app/api/*', accessed: false, icon: <Key className="w-4 h-4" /> },
  { id: 'rds-prod', type: 'rds', name: 'prod-db-cluster', accessed: false, icon: <Database className="w-4 h-4" /> },
  { id: 'rds-staging', type: 'rds', name: 'staging-db', accessed: false, icon: <Database className="w-4 h-4" /> },
];

const PERMISSIONS = [
  's3:ListAllMyBuckets', 's3:GetObject', 'iam:GetRole', 'iam:GetRolePolicy',
  'lambda:GetFunction', 'ssm:GetParameters', 'kms:Decrypt', 'rds-data:ExecuteStatement',
  'ec2:DescribeVpcs', 'cloudformation:DescribeStacks', 'logs:FilterLogEvents',
  'cloudtrail:LookupEvents', 'sts:AssumeRole',
];

// ── Component ──────────────────────────────────────────────────────

export function ConfusedDeputyPanel() {
  // State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [points, setPoints] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [resources, setResources] = useState<EnvResource[]>(DEFAULT_RESOURCES);
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<number>>(new Set());
  const [defenseMode, setDefenseMode] = useState(false);
  const [defenseRules, setDefenseRules] = useState<DefenseRules>({
    blockCredentialReads: false, requireApprovalForDestructive: false,
    validateRoleBeforeAction: false, trackMultiTurnIntent: false,
  });
  const [revealedHints, setRevealedHints] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'env' | 'leaderboard' | 'defense' | 'hints'>('env');
  const [sessionActive, setSessionActive] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Timer
  useEffect(() => {
    if (!sessionActive || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          setSessionActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionActive, timeRemaining]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch leaderboard
  useEffect(() => {
    fetch('/api/sandbox?action=leaderboard')
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch(() => {});
  }, []);

  // Create session
  const createSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-session' }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages([]);
      setPoints(0);
      setTimeRemaining(600);
      setResources(DEFAULT_RESOURCES.map((r) => ({ ...r, accessed: false })));
      setDefenseMode(false);
      setDefenseRules({ blockCredentialReads: false, requireApprovalForDestructive: false, validateRoleBeforeAction: false, trackMultiTurnIntent: false });
      setExpandedAnnotations(new Set());
      setSessionActive(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, []);

  // Send prompt
  const sendPrompt = useCallback(async () => {
    if (!input.trim() || !sessionId || loading || !sessionActive) return;
    const promptText = input.trim();
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prompt', sessionId, prompt: promptText }),
      });
      const data = await res.json();

      const userMsg: ChatMessage = { role: 'user', content: promptText, timestamp: Date.now() };
      const agentMsg: ChatMessage = {
        role: 'agent', content: data.response, action: data.action,
        points: data.points, annotation: data.annotation, timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, agentMsg]);
      setPoints(data.totalPoints || 0);

      // Update resources based on action
      if (data.success) {
        const actionLower = data.action.toLowerCase();
        setResources((prev) =>
          prev.map((r) => {
            if (actionLower.includes(r.type) || actionLower.includes(r.id)) return { ...r, accessed: true };
            return r;
          })
        );
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [input, sessionId, loading, sessionActive]);

  // Toggle defense
  const toggleDefense = useCallback(async () => {
    if (!sessionId) return;
    const newMode = !defenseMode;
    setDefenseMode(newMode);
    await fetch('/api/sandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-defense', sessionId, defenseMode: newMode, defenseRules }),
    });
  }, [sessionId, defenseMode, defenseRules]);

  // Toggle defense rule
  const toggleDefenseRule = useCallback(async (key: keyof DefenseRules) => {
    if (!sessionId) return;
    const newRules = { ...defenseRules, [key]: !defenseRules[key] };
    setDefenseRules(newRules);
    await fetch('/api/sandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-defense', sessionId, defenseMode, defenseRules: newRules }),
    });
  }, [sessionId, defenseMode, defenseRules]);

  // Export session
  const exportSession = useCallback(() => {
    const data = { sessionId, points, messages, resources, defenseMode, defenseRules, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confused-deputy-session-${sessionId?.slice(-8) || 'unknown'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessionId, points, messages, resources, defenseMode, defenseRules]);

  // Format time
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Type colors
  const typeColor: Record<string, string> = { s3: '#f59e0b', iam: '#8b5cf6', lambda: '#06b6d4', ssm: '#ec4899', rds: '#ef4444' };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-black text-green-400 font-mono text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-green-900/50 bg-black/80">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-green-500" />
          <span className="text-green-300 font-bold tracking-wider text-xs uppercase">
            Confused Deputy Sandbox
          </span>
          {sessionActive && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className={`flex items-center gap-1.5 text-xs ${timeRemaining < 60 ? 'text-red-400' : timeRemaining < 180 ? 'text-yellow-400' : 'text-green-500'}`}>
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">{fmtTime(timeRemaining)}</span>
          </div>
          {/* Points */}
          <motion.div
            key={points}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5 text-xs text-yellow-400"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="font-bold tabular-nums">{points}</span>
          </motion.div>
          {/* Defense mode badge */}
          {defenseMode && (
            <span className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800">
              <Shield className="w-3 h-3" /> DEFENSE
            </span>
          )}
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT PANEL: Chat ─── */}
        <div className="flex-1 flex flex-col border-r border-green-900/30">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {!sessionActive && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                <ShieldOff className="w-12 h-12 text-green-700 mb-3" />
                <p className="text-green-500 text-lg mb-1">Confused Deputy Attack Lab</p>
                <p className="text-green-700 text-xs max-w-md mb-4">
                  Trick the AI agent into exfiltrating synthetic AWS credentials or accessing
                  production databases. Use social engineering, role confusion, and multi-turn attacks.
                </p>
                <button
                  onClick={createSession}
                  disabled={loading}
                  className="px-4 py-2 bg-green-900/30 border border-green-700 rounded text-green-300 hover:bg-green-900/50 transition text-xs uppercase tracking-wider"
                >
                  <RefreshCw className={`w-3.5 h-3.5 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Start Session
                </button>
              </div>
            )}

            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-green-950/60 border border-green-800/40'
                        : 'bg-black/60 border border-green-900/30'
                    }`}
                  >
                    {/* Role label */}
                    <div className={`text-[10px] uppercase tracking-widest mb-1 ${msg.role === 'user' ? 'text-green-600' : 'text-green-800'}`}>
                      {msg.role === 'user' ? '> you' : 'agent:'}
                    </div>
                    {/* Content */}
                    <div className={`whitespace-pre-wrap text-xs leading-relaxed ${msg.role === 'user' ? 'text-green-300' : 'text-green-400/80'}`}>
                      {msg.content}
                    </div>

                    {/* Agent metadata: action, points, annotation */}
                    {msg.role === 'agent' && msg.action && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-green-900/20 pt-2">
                        {/* Action */}
                        <span
                          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                            msg.action === 'BLOCKED' || msg.action === 'SECURITY_EVENT_LOGGED'
                              ? 'bg-red-950/50 text-red-400 border border-red-900/30'
                              : msg.action.includes('GUARDRAIL')
                                ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/30'
                                : 'bg-green-950/50 text-green-300 border border-green-800/30'
                          }`}
                        >
                          {msg.action === 'BLOCKED' || msg.action === 'SECURITY_EVENT_LOGGED' || msg.action.includes('GUARDRAIL')
                            ? <XCircle className="w-3 h-3" />
                            : <CheckCircle className="w-3 h-3" />
                          }
                          {msg.action}
                        </span>

                        {/* Points */}
                        {(msg.points ?? 0) > 0 && (
                          <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold"
                          >
                            +{msg.points} <Zap className="w-3 h-3" />
                          </motion.span>
                        )}

                        {/* Annotation toggle */}
                        {msg.annotation && (
                          <button
                            onClick={() => {
                              setExpandedAnnotations((prev) => {
                                const next = new Set(prev);
                                next.has(i) ? next.delete(i) : next.add(i);
                                return next;
                              });
                            }}
                            className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-400 transition"
                          >
                            <Lightbulb className="w-3 h-3" />
                            <span>{expandedAnnotations.has(i) ? 'hide' : 'learn'}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${expandedAnnotations.has(i) ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Expanded annotation */}
                    <AnimatePresence>
                      {msg.role === 'agent' && msg.annotation && expandedAnnotations.has(i) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 text-[11px] leading-relaxed text-amber-400/80 bg-amber-950/20 border border-amber-900/20 rounded p-2">
                            {msg.annotation}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-black/60 border border-green-900/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 text-green-600 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="ml-1">analyzing prompt...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Session expired */}
            {timeRemaining === 0 && sessionActive === false && messages.length > 0 && (
              <div className="text-center text-red-400 text-xs py-4 border border-red-900/30 rounded bg-red-950/20">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                SESSION EXPIRED — Final Score: {points} points
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-green-900/40 px-4 py-2 flex items-center gap-2 bg-black/80">
            <span className="text-green-700 text-xs">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendPrompt()}
              placeholder={sessionActive ? 'Type your attack prompt...' : 'Start a session to begin'}
              disabled={!sessionActive || loading}
              className="flex-1 bg-transparent text-green-300 text-xs placeholder:text-green-800 outline-none disabled:opacity-30"
            />
            <button
              onClick={sendPrompt}
              disabled={!sessionActive || loading || !input.trim()}
              className="p-1.5 text-green-500 hover:text-green-300 disabled:opacity-30 disabled:hover:text-green-500 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div className="w-80 xl:w-96 flex flex-col overflow-hidden bg-black/50">
          {/* Tab bar */}
          <div className="flex border-b border-green-900/30">
            {([['env', 'Environment'], ['leaderboard', 'Board'], ['defense', 'Defense'], ['hints', 'Hints']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] uppercase tracking-wider text-center transition border-b-2 ${
                  activeTab === tab
                    ? 'text-green-400 border-green-500'
                    : 'text-green-700 border-transparent hover:text-green-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <AnimatePresence mode="wait">
              {/* ── ENVIRONMENT TAB ── */}
              {activeTab === 'env' && (
                <motion.div key="env" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-4">
                  {/* Resource grid */}
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-green-700 mb-2">AWS Resources</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {resources.map((r) => (
                        <motion.div
                          key={r.id}
                          animate={{ opacity: r.accessed ? 1 : 0.5 }}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-[10px] ${
                            r.accessed
                              ? 'border-green-700/50 bg-green-950/30'
                              : 'border-green-900/20 bg-black/40'
                          }`}
                        >
                          <span style={{ color: typeColor[r.type] }}>{r.icon}</span>
                          <span className={`${r.accessed ? 'text-green-300' : 'text-green-700'} truncate ${r.accessed ? 'line-through decoration-red-500/50' : ''}`}>
                            {r.name}
                          </span>
                          {r.accessed && <Eye className="w-3 h-3 text-red-400 ml-auto shrink-0" />}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Permissions list */}
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-green-700 mb-2">Agent Permissions</div>
                    <div className="space-y-0.5">
                      {PERMISSIONS.map((p) => (
                        <div key={p} className="flex items-center gap-1.5 text-[10px] text-green-600">
                          <Unlock className="w-3 h-3" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── LEADERBOARD TAB ── */}
              {activeTab === 'leaderboard' && (
                <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3">
                  <div className="text-[10px] uppercase tracking-widest text-green-700 mb-2">Top Hackers</div>
                  <div className="space-y-1">
                    {/* Current player (virtual entry) */}
                    {sessionActive && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-900/20 border border-green-700/30"
                      >
                        <span className="text-[10px] text-green-400 font-bold w-4">*</span>
                        <span className="text-[10px] text-green-300 flex-1">YOU</span>
                        <span className="text-[10px] text-yellow-400 font-mono tabular-nums">{points}</span>
                        <span className="text-[10px] text-green-600 font-mono tabular-nums">{fmtTime(600 - timeRemaining)}</span>
                      </motion.div>
                    )}

                    {leaderboard.map((entry, idx) => (
                      <motion.div
                        key={entry.rank}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-green-950/30 transition"
                      >
                        <span className={`text-[10px] font-bold w-4 ${entry.rank <= 3 ? 'text-yellow-400' : 'text-green-700'}`}>
                          {entry.rank <= 3 ? <Star className="w-3 h-3" /> : entry.rank}
                        </span>
                        <span className="text-[10px] text-green-500 flex-1 truncate">{entry.name}</span>
                        <span className="text-[10px] text-green-400 font-mono tabular-nums">{entry.points}</span>
                        <span className="text-[10px] text-green-700 font-mono tabular-nums w-10 text-right">{entry.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── DEFENSE TAB ── */}
              {activeTab === 'defense' && (
                <motion.div key="defense" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-3">
                  {/* Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-green-700">Defense Mode</div>
                      <div className="text-[10px] text-green-600 mt-0.5">Build guardrails, then re-test your prompts</div>
                    </div>
                    <button
                      onClick={toggleDefense}
                      className={`p-2 rounded-lg border transition ${
                        defenseMode
                          ? 'bg-cyan-950/30 border-cyan-700 text-cyan-400'
                          : 'bg-green-950/20 border-green-900/40 text-green-700 hover:text-green-500'
                      }`}
                    >
                      {defenseMode ? <Shield className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
                    </button>
                  </div>

                  {defenseMode && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      <div className="text-[10px] uppercase tracking-widest text-cyan-700 mb-1">Guardrails</div>
                      {(
                        [
                          ['blockCredentialReads', 'Block credential reads', 'Prevents access to passwords, keys, and secrets'],
                          ['requireApprovalForDestructive', 'Require approval for destructive actions', 'Delete, drop, and purge operations need manager sign-off'],
                          ['validateRoleBeforeAction', 'Validate role before action', 'Requires identity verification for role-based requests'],
                          ['trackMultiTurnIntent', 'Track multi-turn intent', 'Detects escalating information request patterns'],
                        ] as const
                      ).map(([key, title, desc]) => (
                        <button
                          key={key}
                          onClick={() => toggleDefenseRule(key)}
                          className={`w-full text-left px-3 py-2 rounded border transition ${
                            defenseRules[key]
                              ? 'bg-cyan-950/20 border-cyan-800/50'
                              : 'bg-black/40 border-green-900/20 hover:border-green-800/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] ${defenseRules[key] ? 'text-cyan-300' : 'text-green-600'}`}>{title}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${defenseRules[key] ? 'bg-cyan-900/30 text-cyan-400' : 'bg-green-900/20 text-green-700'}`}>
                              {defenseRules[key] ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <div className="text-[9px] text-green-700 mt-0.5">{desc}</div>
                        </button>
                      ))}

                      <div className="border-t border-cyan-900/20 pt-2 mt-3">
                        <div className="text-[10px] text-cyan-600">
                          💡 Enable guardrails, then try your previous attack prompts to see if the hardened agent resists.
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!defenseMode && (
                    <div className="text-center py-6 text-green-800 text-[10px]">
                      <ShieldOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Defense mode is off.<br />The agent is vulnerable.
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── HINTS TAB ── */}
              {activeTab === 'hints' && (
                <motion.div key="hints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-green-700 mb-2">
                    Stuck? Attack vectors to try:
                  </div>
                  {HINTS.map((hint) => (
                    <div key={hint.id} className="border border-green-900/20 rounded overflow-hidden">
                      <button
                        onClick={() => {
                          setRevealedHints((prev) => {
                            const next = new Set(prev);
                            next.has(hint.id) ? next.delete(hint.id) : next.add(hint.id);
                            return next;
                          });
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-green-950/30 transition"
                      >
                        <span className="text-green-600">{hint.icon}</span>
                        <span className="text-[11px] text-green-500 flex-1">{hint.title}</span>
                        <ChevronDown className={`w-3 h-3 text-green-700 transition-transform ${revealedHints.has(hint.id) ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {revealedHints.has(hint.id) && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-2 text-[10px] text-green-500/70 leading-relaxed">
                              {hint.text}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── SESSION CONTROLS (bottom) ── */}
          <div className="border-t border-green-900/30 px-3 py-2 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={createSession}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] uppercase tracking-wider text-green-400 bg-green-950/30 border border-green-800/30 rounded hover:bg-green-900/40 transition disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                New Session
              </button>
              <button
                onClick={exportSession}
                disabled={messages.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] uppercase tracking-wider text-green-600 bg-green-950/20 border border-green-900/20 rounded hover:bg-green-900/30 transition disabled:opacity-30"
              >
                <Server className="w-3 h-3" />
                Export JSON
              </button>
            </div>

            {/* Attack history (collapsed) */}
            {messages.length > 0 && (
              <div>
                <button
                  onClick={() => setActiveTab(activeTab === 'env' ? 'env' : activeTab)}
                  className="flex items-center gap-1.5 text-[10px] text-green-700 hover:text-green-500 transition w-full"
                >
                  <Target className="w-3 h-3" />
                  <span>Attack History ({messages.filter((m) => m.role === 'user').length} attempts)</span>
                  <span className="text-green-800 ml-auto">
                    {messages.filter((m) => m.role === 'agent' && m.points && m.points > 0).length} succeeded
                  </span>
                </button>
                <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5 scrollbar-thin">
                  {messages
                    .filter((m) => m.role === 'user')
                    .map((m, i) => {
                      const agentResp = messages[i * 2 + 1];
                      return (
                        <div key={i} className="flex items-center gap-1.5 text-[9px]">
                          <span className="text-green-800 w-3">#{i + 1}</span>
                          <span className="text-green-600 truncate flex-1">{m.content}</span>
                          {agentResp?.points && agentResp.points > 0 ? (
                            <span className="text-yellow-500">+{agentResp.points}</span>
                          ) : (
                            <span className="text-red-800">blocked</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
