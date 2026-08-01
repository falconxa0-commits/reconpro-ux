'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, RotateCcw, Maximize, Minimize, Volume2, VolumeX,
  Radio, Wifi, Globe, Shield, AlertTriangle, Bug, Terminal, Eye,
  Zap, RadioTower, Activity, CircleDot, Lock, Unlock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

type StreamEvent = {
  id: string;
  type: 'SCAN_START' | 'SUBDOMAIN_FOUND' | 'PORT_OPEN' | 'VULN_FOUND' | 'SCAN_COMPLETE' | 'AMBIENT';
  timestamp: string;
  message: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  details?: { asset: string; category: string; cve?: string; cvss?: number; evidence?: string };
};

type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
};

type TopoNode = {
  id: string; label: string; x: number; y: number;
  vx: number; vy: number; radius: number;
  color: string; glowIntensity: number; hasVuln: boolean;
};

type TopoEdge = {
  from: string; to: string; progress: number; active: boolean;
};

type ScanData = {
  id: string; target: { domain: string; ip?: string | null } | null;
  status: string; scanType: string; startedAt: string;
  riskScore: number; criticalCount: number; highCount: number;
  mediumCount: number; lowCount: number; infoCount: number;
  findings: {
    id: string; title: string; severity: string; category: string;
    description: string; evidence?: string | null; asset: string;
    cve?: string | null; cvss?: number | null;
  }[];
};

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const STREAM_ID = `reconpro.io/stream/${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 14)}`;
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308',
  low: '#3b82f6', info: '#6b7280',
};
const AMBIENT_MESSAGES = [
  'Running passive reconnaissance...', 'Checking DNS records...',
  'Probing TLS configuration...', 'Analyzing HTTP headers...',
  'Enumerating subdomains (batch)...', 'Fingerprinting web technologies...',
  'Testing rate limiting endpoints...', 'Checking certificate transparency logs...',
  'Scanning common admin paths...', 'Analyzing response patterns...',
  'Checking WAF signatures...', 'Fuzzing API endpoints...',
  'Resolving CNAME chains...', 'Testing CORS configuration...',
  'Checking robots.txt disallows...', 'Analyzing Content-Security-Policy...',
];
const FAKE_SUBDOMAINS = ['www', 'api', 'mail', 'admin', 'cdn', 'staging', 'dev', 'auth', 'graphql', 'portal'];
const FAKE_PORTS = [22, 80, 443, 8080, 8443, 3000, 5432, 6379, 27017, 3306];

// ═══════════════════════════════════════════════════════════════════════
// Web Audio Sound Engine Hook
// ═══════════════════════════════════════════════════════════════════════

function useSoundEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const masterGainRef = useRef<GainNode | null>(null);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      ctxRef.current = ac;
      const g = ac.createGain();
      g.gain.value = volume / 100;
      g.connect(ac.destination);
      masterGainRef.current = g;
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return { ctx: ctxRef.current, master: masterGainRef.current! };
  }, [volume]);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = volume / 100;
  }, [volume]);

  const playSonar = useCallback(() => {
    if (muted) return;
    const { ctx, master } = ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 800;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(g); g.connect(master);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  }, [muted, ensureCtx]);

  const playExplosion = useCallback(() => {
    if (muted) return;
    const { ctx, master } = ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = 60;
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g); g.connect(master);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  }, [muted, ensureCtx]);

  const playSiren = useCallback(() => {
    if (muted) return;
    const { ctx, master } = ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 1);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 2);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.setValueAtTime(0.2, ctx.currentTime + 1.7);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
    osc.connect(g); g.connect(master);
    osc.start(); osc.stop(ctx.currentTime + 2);
  }, [muted, ensureCtx]);

  const playAmbient = useCallback(() => {
    if (muted) return;
    const { ctx, master } = ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 55;
    g.gain.value = 0.02;
    osc.connect(g); g.connect(master);
    osc.start();
    return { stop: () => { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1); osc.stop(ctx.currentTime + 1); } };
  }, [muted, ensureCtx]);

  useEffect(() => {
    return () => {
      if (ctxRef.current && ctxRef.current.state !== 'closed') ctxRef.current.close();
    };
  }, []);

  return { playSonar, playExplosion, playSiren, playAmbient, muted, setMuted, volume, setVolume };
}

// ═══════════════════════════════════════════════════════════════════════
// Canvas Particle System Hook
// ═══════════════════════════════════════════════════════════════════════

function useParticleSystem(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  const spawnParticles = useCallback((severity: string, cx: number, cy: number) => {
    const count = severity === 'critical' ? 55 : severity === 'high' ? 30 : severity === 'medium' ? 15 : 10;
    const speed = severity === 'critical' ? 8 : severity === 'high' ? 5 : severity === 'medium' ? 3 : 1.5;
    const lifeBase = severity === 'critical' ? 90 : severity === 'high' ? 60 : severity === 'medium' ? 40 : 25;
    const color = SEVERITY_COLORS[severity] || '#3b82f6';
    const secondColor = severity === 'critical' ? '#fbbf24' : severity === 'high' ? '#fde68a' : '#93c5fd';

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const v = speed * (0.5 + Math.random() * 0.8);
      particlesRef.current.push({
        x: cx, y: cy, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        life: lifeBase + Math.random() * 20, maxLife: lifeBase + 20,
        color: Math.random() > 0.5 ? color : secondColor,
        size: 1.5 + Math.random() * (severity === 'critical' ? 4 : 2.5),
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect();
      if (r) { canvas.width = r.width; canvas.height = r.height; }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const GRAVITY = 0.08;
    const animate = () => {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy; p.vy += GRAVITY; p.vx *= 0.99; p.life--;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        const alpha = p.life / p.maxLife;
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx!.fill();
        // Trail
        ctx!.strokeStyle = p.color;
        ctx!.lineWidth = p.size * 0.4 * alpha;
        ctx!.beginPath(); ctx!.moveTo(p.x, p.y);
        ctx!.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, [canvasRef]);

  return { spawnParticles };
}

// ═══════════════════════════════════════════════════════════════════════
// Network Topology Renderer Hook
// ═══════════════════════════════════════════════════════════════════════

function useTopology(topoCanvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const nodesRef = useRef<TopoNode[]>([]);
  const edgesRef = useRef<TopoEdge[]>([]);
  const animRef = useRef<number>(0);

  const addNode = useCallback((id: string, label: string, hasVuln: boolean) => {
    const canvas = topoCanvasRef.current;
    if (!canvas) return;
    const exists = nodesRef.current.find(n => n.id === id);
    if (exists) {
      if (hasVuln) { exists.hasVuln = true; exists.color = '#ef4444'; }
      exists.glowIntensity = 1;
      return;
    }
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 100;
    nodesRef.current.push({
      id, label, x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
      vx: 0, vy: 0, radius: 8 + Math.random() * 6,
      color: hasVuln ? '#ef4444' : '#22c55e', glowIntensity: 1, hasVuln,
    });
  }, [topoCanvasRef]);

  const addEdge = useCallback((from: string, to: string) => {
    if (edgesRef.current.find(e => (e.from === from && e.to === to) || (e.from === to && e.to === from))) return;
    edgesRef.current.push({ from, to, progress: 0, active: true });
  }, []);

  useEffect(() => {
    const canvas = topoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect();
      if (r) { canvas.width = r.width; canvas.height = r.height; }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const animate = () => {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Simple force simulation
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = 80;
          if (dist < minDist) {
            const force = (minDist - dist) * 0.02;
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
          }
        }
        // Center gravity
        const cx = canvas!.width / 2, cy = canvas!.height / 2;
        nodes[i].vx += (cx - nodes[i].x) * 0.001;
        nodes[i].vy += (cy - nodes[i].y) * 0.001;
      }

      // Update positions
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.vx *= 0.9; n.vy *= 0.9;
        n.x = Math.max(n.radius + 5, Math.min(canvas!.width - n.radius - 5, n.x));
        n.y = Math.max(n.radius + 5, Math.min(canvas!.height - n.radius - 5, n.y));
        n.glowIntensity = Math.max(0, n.glowIntensity - 0.005);
      }

      // Draw edges
      for (const e of edges) {
        const a = nodes.find(n => n.id === e.from);
        const b = nodes.find(n => n.id === e.to);
        if (!a || !b) continue;
        e.progress = Math.min(1, e.progress + 0.03);
        ctx!.strokeStyle = e.active ? 'rgba(0,255,136,0.3)' : 'rgba(100,100,100,0.15)';
        ctx!.lineWidth = 1;
        ctx!.beginPath(); ctx!.moveTo(a.x, a.y);
        const ex = a.x + (b.x - a.x) * e.progress;
        const ey = a.y + (b.y - a.y) * e.progress;
        ctx!.lineTo(ex, ey); ctx!.stroke();
      }

      // Draw nodes
      for (const n of nodes) {
        // Glow
        if (n.glowIntensity > 0.01) {
          const grad = ctx!.createRadialGradient(n.x, n.y, n.radius, n.x, n.y, n.radius * 3);
          grad.addColorStop(0, n.color + '80');
          grad.addColorStop(1, 'transparent');
          ctx!.fillStyle = grad;
          ctx!.globalAlpha = n.glowIntensity * 0.6;
          ctx!.beginPath(); ctx!.arc(n.x, n.y, n.radius * 3, 0, Math.PI * 2); ctx!.fill();
          ctx!.globalAlpha = 1;
        }
        // Circle
        ctx!.fillStyle = n.color;
        ctx!.globalAlpha = 0.15;
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.radius + 2, 0, Math.PI * 2); ctx!.fill();
        ctx!.globalAlpha = 1;
        ctx!.fillStyle = '#0a0a0a';
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.radius, 0, Math.PI * 2); ctx!.fill();
        ctx!.strokeStyle = n.color;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
        // Label
        ctx!.fillStyle = '#9ca3af';
        ctx!.font = '9px monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(n.label.length > 14 ? n.label.slice(0, 12) + '..' : n.label, n.x, n.y + n.radius + 14);
      }

      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, [topoCanvasRef]);

  return { addNode, addEdge };
}

// ═══════════════════════════════════════════════════════════════════════
// Event Icon Helper
// ═══════════════════════════════════════════════════════════════════════

function EventIcon({ type, severity }: { type: StreamEvent['type']; severity?: string }) {
  const cls = 'w-3.5 h-3.5 shrink-0';
  switch (type) {
    case 'SCAN_START': return <Radio className={cn(cls, 'text-green-400')} />;
    case 'SUBDOMAIN_FOUND': return <Globe className={cn(cls, 'text-cyan-400')} />;
    case 'PORT_OPEN': return <Wifi className={cn(cls, 'text-purple-400')} />;
    case 'VULN_FOUND': return severity === 'critical' || severity === 'high'
      ? <AlertTriangle className={cn(cls, SEVERITY_COLORS[severity || 'medium'])} />
      : <Bug className={cn(cls, SEVERITY_COLORS[severity || 'medium'])} />;
    case 'SCAN_COMPLETE': return <Shield className={cn(cls, 'text-green-400')} />;
    default: return <Terminal className={cn(cls, 'text-gray-500')} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════

export function WarRoomPanel() {
  // Refs
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const topoCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventLogRef = useRef<HTMLDivElement>(null);
  const ambientStopRef = useRef<(() => void) | null>(null);

  // Sound & Particles & Topology
  const sound = useSoundEngine();
  const { spawnParticles } = useParticleSystem(particleCanvasRef);
  const { addNode, addEdge } = useTopology(topoCanvasRef);

  // Stream state
  const [streaming, setStreaming] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [viewers, setViewers] = useState(87);
  const [fullscreen, setFullscreen] = useState(false);
  const [criticalFlash, setCriticalFlash] = useState(false);
  const [replayMode, setReplayMode] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [replayEvents, setReplayEvents] = useState<StreamEvent[]>([]);
  const [loadedScan, setLoadedScan] = useState<ScanData | null>(null);
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Viewer count simulation ──
  useEffect(() => {
    if (!streaming) return;
    const iv = setInterval(() => setViewers(v => {
      const delta = Math.floor(Math.random() * 7) - 3;
      return Math.max(42, Math.min(247, v + delta));
    }), 3000);
    return () => clearInterval(iv);
  }, [streaming]);

  // ── Auto-scroll event log ──
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [events]);

  // ── Critical border flash ──
  const flashCritical = useCallback(() => {
    setCriticalFlash(true);
    setTimeout(() => setCriticalFlash(false), 800);
  }, []);

  // ── Trigger particle + sound on vuln ──
  const triggerVulnEffects = useCallback((severity: string) => {
    const canvas = particleCanvasRef.current;
    if (canvas) {
      const cx = canvas.width * (0.3 + Math.random() * 0.4);
      const cy = canvas.height * (0.3 + Math.random() * 0.4);
      spawnParticles(severity, cx, cy);
    }
    if (severity === 'critical') { sound.playSiren(); sound.playExplosion(); flashCritical(); }
    else if (severity === 'high') { sound.playExplosion(); }
    else { sound.playSonar(); }
  }, [spawnParticles, sound, flashCritical]);

  // ── Convert scan data to stream events ──
  const scanToEvents = useCallback((scan: ScanData): StreamEvent[] => {
    const domain = scan.target?.domain || 'unknown';
    const evts: StreamEvent[] = [];
    let ts = new Date(scan.startedAt).getTime();
    const t = () => { ts += 800 + Math.random() * 1200; return new Date(ts).toISOString(); };

    evts.push({ id: crypto.randomUUID(), type: 'SCAN_START', timestamp: t(),
      message: `[RECON] Full scan initiated → ${domain} (${scan.scanType})`, severity: 'info' });

    // Subdomains
    const subCount = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < subCount; i++) {
      evts.push({ id: crypto.randomUUID(), type: 'SUBDOMAIN_FOUND', timestamp: t(),
        message: `[DISCOVER] ${FAKE_SUBDOMAINS[i % FAKE_SUBDOMAINS.length]}.${domain} → ${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
        severity: 'info' });
    }

    // Ports
    const portCount = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < portCount; i++) {
      const port = FAKE_PORTS[i % FAKE_PORTS.length];
      const svc = port === 22 ? 'SSH' : port === 80 ? 'HTTP' : port === 443 ? 'HTTPS' : port === 8080 ? 'HTTP-Proxy' : port === 5432 ? 'PostgreSQL' : port === 6379 ? 'Redis' : port === 27017 ? 'MongoDB' : port === 3306 ? 'MySQL' : 'Unknown';
      evts.push({ id: crypto.randomUUID(), type: 'PORT_OPEN', timestamp: t(),
        message: `[PORT] ${port}/tcp OPEN → ${svc}`, severity: port >= 5432 ? 'medium' : 'info' });
    }

    // Ambient padding between phases
    const ambientsBeforeVulns = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < ambientsBeforeVulns; i++) {
      evts.push({ id: crypto.randomUUID(), type: 'AMBIENT', timestamp: t(),
        message: AMBIENT_MESSAGES[Math.floor(Math.random() * AMBIENT_MESSAGES.length)], severity: 'info' });
    }

    // Findings
    const sortedFindings = [...scan.findings].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });

    for (const f of sortedFindings) {
      evts.push({ id: f.id, type: 'VULN_FOUND', timestamp: t(),
        message: `[${f.severity.toUpperCase()}] ${f.title} on ${f.asset}`,
        severity: f.severity as StreamEvent['severity'],
        details: { asset: f.asset, category: f.category, cve: f.cve || undefined, cvss: f.cvss || undefined, evidence: f.evidence || undefined } });
      // Ambient after vuln
      if (f.severity !== 'info') {
        evts.push({ id: crypto.randomUUID(), type: 'AMBIENT', timestamp: t(),
          message: AMBIENT_MESSAGES[Math.floor(Math.random() * AMBIENT_MESSAGES.length)], severity: 'info' });
      }
    }

    evts.push({ id: crypto.randomUUID(), type: 'SCAN_COMPLETE', timestamp: t(),
      message: `[DONE] Scan complete → ${scan.findings.length} findings, Risk Score: ${scan.riskScore}/100`,
      severity: 'info' });

    return evts;
  }, []);

  // ── Start stream: fetch scans and replay ──
  const startStream = useCallback(async () => {
    if (streaming) return;
    try {
      const res = await fetch('/api/scans');
      const data = await res.json();
      const scans: ScanData[] = data.scans || [];
      if (scans.length === 0) {
        // Fallback: generate a synthetic scan
        const fakeScan: ScanData = {
          id: crypto.randomUUID(), target: { domain: 'example.com', ip: '93.184.216.34' },
          status: 'completed', scanType: 'full', startedAt: new Date().toISOString(),
          riskScore: 62, criticalCount: 1, highCount: 3, mediumCount: 5, lowCount: 4, infoCount: 2,
          findings: [
            { id: crypto.randomUUID(), title: 'Missing Content-Security-Policy header', severity: 'medium', category: 'header', description: 'No CSP header found', asset: 'example.com', evidence: 'Response headers lack Content-Security-Policy' },
            { id: crypto.randomUUID(), title: 'Open Redis instance on port 6379', severity: 'critical', category: 'port', description: 'Redis accessible without auth', asset: 'db.example.com:6379', cve: 'CVE-2021-41077', cvss: 9.8, evidence: 'AUTH command succeeded without password' },
            { id: crypto.randomUUID(), title: 'SSL certificate expires in 12 days', severity: 'high', category: 'ssl', description: 'Certificate approaching expiry', asset: 'example.com', evidence: 'notAfter: 2025-01-28T23:59:59Z' },
            { id: crypto.randomUUID(), title: 'Admin panel accessible without auth', severity: 'critical', category: 'vulnerability', description: '/admin returns 200 without session', asset: 'admin.example.com', cve: 'CVE-N/A', cvss: 9.1, evidence: 'HTTP 200, body contains dashboard' },
            { id: crypto.randomUUID(), title: 'Missing HSTS header', severity: 'medium', category: 'header', description: 'Strict-Transport-Security not set', asset: 'example.com', evidence: 'Response headers lack HSTS' },
            { id: crypto.randomUUID(), title: 'Subdomain takeover possible on staging.example.com', severity: 'high', category: 'subdomain', description: 'CNAME points to dormant service', asset: 'staging.example.com', evidence: 'CNAME → verved.customers.net (NXDOMAIN)' },
          ],
        };
        scans.unshift(fakeScan);
      }

      const scan = scans[0];
      setLoadedScan(scan);
      const domain = scan.target?.domain || 'target';

      // Add central node
      addNode('root', domain, scan.riskScore > 60);

      const allEvents = scanToEvents(scan);
      setReplayEvents(allEvents);
      setEvents([]);
      setStreaming(true);
      setReplayProgress(0);

      // Start ambient drone
      const ambient = sound.playAmbient();
      if (ambient) ambientStopRef.current = ambient.stop;

      // Replay events with delays
      let idx = 0;
      const replayNext = () => {
        if (idx >= allEvents.length) {
          setStreaming(false);
          ambientStopRef.current?.();
          return;
        }
        const evt = allEvents[idx];
        setEvents(prev => [...prev, evt]);
        setReplayProgress(((idx + 1) / allEvents.length) * 100);

        // Topology updates
        if (evt.type === 'SUBDOMAIN_FOUND') {
          const match = evt.message.match(/\[DISCOVER\] (\S+) →/);
          if (match) { addNode(match[1], match[1], false); addEdge('root', match[1]); }
        } else if (evt.type === 'PORT_OPEN') {
          const match = evt.message.match(/\[PORT\] (\d+)/);
          if (match) addNode(`port-${match[1]}`, `:${match[1]}`, Number(match[1]) >= 5432);
        } else if (evt.type === 'VULN_FOUND') {
          if (evt.details) addNode(`vuln-${evt.id}`, evt.details.asset, true);
          triggerVulnEffects(evt.severity || 'medium');
        }

        idx++;
        const delay = evt.type === 'VULN_FOUND'
          ? (evt.severity === 'critical' ? 1500 : evt.severity === 'high' ? 1000 : 500)
          : 200 + Math.random() * 300;
        setTimeout(replayNext, delay);
      };
      replayNext();
    } catch (err) {
      console.error('Stream start error:', err);
    }
  }, [streaming, scanToEvents, addNode, addEdge, sound, triggerVulnEffects]);

  // ── Stop stream ──
  const stopStream = useCallback(() => {
    setStreaming(false);
    ambientStopRef.current?.();
  }, []);

  // ── Restart stream ──
  const restartStream = useCallback(() => {
    stopStream();
    setTimeout(() => { setEvents([]); setReplayEvents([]); setLoadedScan(null); startStream(); }, 300);
  }, [stopStream, startStream]);

  // ── Replay mode scrub ──
  const startReplayMode = useCallback(() => {
    if (events.length === 0) return;
    setReplayMode(true);
    setStreaming(false);
    ambientStopRef.current?.();
    setReplayEvents(prev => prev.length === 0 ? [...events] : prev);
  }, [events]);

  useEffect(() => {
    if (!replayMode || replayEvents.length === 0) return;
    const visibleCount = Math.floor((replayProgress / 100) * replayEvents.length);
    setEvents(replayEvents.slice(0, visibleCount));
  }, [replayProgress, replayMode, replayEvents]);

  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, []);

  // ── Fullscreen toggle ──
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && streamContainerRef.current) {
      streamContainerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Scan stats memo ──
  const stats = useMemo(() => {
    const vulns = events.filter(e => e.type === 'VULN_FOUND');
    return {
      total: events.length, vulns: vulns.length,
      critical: vulns.filter(v => v.severity === 'critical').length,
      high: vulns.filter(v => v.severity === 'high').length,
      medium: vulns.filter(v => v.severity === 'medium').length,
    };
  }, [events]);

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div ref={streamContainerRef}
      className={cn(
        'relative flex flex-col bg-black rounded-xl overflow-hidden border transition-colors duration-300',
        criticalFlash ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)]' : 'border-gray-800'
      )}>

      {/* ── CRT Scan Lines Overlay ── */}
      <div className="pointer-events-none absolute inset-0 z-30 opacity-[0.03]"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.15) 2px, rgba(0,255,136,0.15) 4px)' }} />

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-950/90 border-b border-gray-800 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {streaming && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            <Radio className={cn('w-4 h-4', streaming ? 'text-red-400' : 'text-gray-600')} />
          </div>
          <span className="text-xs font-mono text-gray-400 truncate max-w-xs">{STREAM_ID}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Viewer count */}
          <div className="flex items-center gap-1.5 text-gray-400">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{viewers}</span>
          </div>

          {/* Stats badges */}
          {stats.vulns > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {stats.critical > 0 && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-900/40 text-red-400">C:{stats.critical}</span>}
              {stats.high > 0 && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-400">H:{stats.high}</span>}
              {stats.medium > 0 && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-400">M:{stats.medium}</span>}
            </div>
          )}

          {/* Volume control */}
          <div className="flex items-center gap-2">
            <button onClick={() => sound.setMuted(!sound.muted)} className="text-gray-400 hover:text-white transition-colors">
              {sound.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input type="range" min="0" max="100" value={sound.volume}
              onChange={e => sound.setVolume(Number(e.target.value))}
              className="w-16 h-1 accent-green-500 cursor-pointer" />
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-gray-400 hover:text-white transition-colors">
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Main Content: Topology + Event Stream ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">

        {/* Network Topology Canvas */}
        <div className="relative w-full lg:w-[45%] h-48 lg:h-auto border-b lg:border-b-0 lg:border-r border-gray-800/50">
          <div className="absolute top-2 left-3 z-10 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Network Topology</span>
          </div>
          <canvas ref={topoCanvasRef} className="w-full h-full" />
        </div>

        {/* Particle overlay (full area) */}
        <canvas ref={particleCanvasRef}
          className="pointer-events-none absolute inset-0 z-10 w-full h-full" />

        {/* Event Stream */}
        <div className="flex-1 flex flex-col min-h-0 relative z-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-800/50 bg-gray-950/60">
            <Terminal className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Live Event Stream</span>
            <span className="ml-auto text-[10px] font-mono text-gray-600">{stats.total} events</span>
          </div>

          <div ref={eventLogRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 font-mono text-xs scrollbar-thin scrollbar-thumb-gray-800"
            style={{ scrollbarWidth: 'thin' }}>

            {!streaming && events.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                <RadioTower className="w-10 h-10 opacity-30" />
                <p className="text-sm">War Room Ready</p>
                <p className="text-[10px] text-gray-700">Click Start to begin the live recon stream</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {events.map(evt => (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Standard event line */}
                  <div className={cn(
                    'flex items-start gap-2 py-0.5 px-1 rounded hover:bg-gray-900/50 transition-colors',
                    evt.type === 'VULN_FOUND' && evt.severity === 'critical' && 'bg-red-950/20',
                  )}>
                    <span className="text-gray-600 shrink-0 w-16 text-right">
                      {new Date(evt.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <EventIcon type={evt.type} severity={evt.severity} />
                    <span className={cn(
                      'break-all',
                      evt.severity === 'critical' ? 'text-red-400 font-bold' :
                      evt.severity === 'high' ? 'text-orange-400' :
                      evt.severity === 'medium' ? 'text-yellow-400' :
                      evt.severity === 'low' ? 'text-blue-400' :
                      '#00ff88',
                    )}>
                      {evt.message}
                    </span>
                  </div>

                  {/* Expanded vuln card */}
                  {evt.type === 'VULN_FOUND' && evt.details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="ml-[4.5rem] mr-2 mb-1 p-2 rounded border bg-gray-950/80 overflow-hidden"
                      style={{ borderColor: SEVERITY_COLORS[evt.severity || 'info'] + '40' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase',
                          evt.severity === 'critical' ? 'bg-red-900/50 text-red-300' :
                          evt.severity === 'high' ? 'bg-orange-900/50 text-orange-300' :
                          'bg-yellow-900/50 text-yellow-300',
                        )}>
                          {evt.severity}
                        </span>
                        {evt.details.cve && (
                          <span className="text-[10px] font-mono text-gray-400">{evt.details.cve}</span>
                        )}
                        {evt.details.cvss != null && (
                          <span className={cn(
                            'text-[10px] font-mono px-1 py-0.5 rounded',
                            evt.details.cvss >= 9 ? 'bg-red-900/40 text-red-300' :
                            evt.details.cvss >= 7 ? 'bg-orange-900/40 text-orange-300' :
                            'bg-yellow-900/40 text-yellow-300',
                          )}>
                            CVSS {evt.details.cvss}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 ml-auto">{evt.details.category}</span>
                      </div>
                      {evt.details.evidence && (
                        <p className="text-[10px] text-gray-500 font-mono mt-1 border-t border-gray-800/50 pt-1">
                          {evt.details.evidence.length > 120 ? evt.details.evidence.slice(0, 120) + '...' : evt.details.evidence}
                        </p>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Bottom Controls ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-950/90 border-t border-gray-800 z-20">
        {/* Stream controls */}
        <div className="flex items-center gap-1.5">
          {!streaming ? (
            <button onClick={startStream}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-900/40 hover:bg-green-900/60 text-green-400 text-xs font-mono transition-colors border border-green-800/40">
              <Play className="w-3.5 h-3.5" /> Start
            </button>
          ) : (
            <button onClick={stopStream}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-mono transition-colors border border-red-800/40">
              <Square className="w-3 h-3" /> Stop
            </button>
          )}
          <button onClick={restartStream}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 text-xs font-mono transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Replay controls */}
        <div className="flex items-center gap-2 flex-1">
          {events.length > 0 && !replayMode && (
            <button onClick={startReplayMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 text-xs font-mono transition-colors">
              <Activity className="w-3.5 h-3.5" /> Replay
            </button>
          )}
          {replayMode && (
            <button onClick={() => setReplayMode(false)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 text-xs font-mono transition-colors border border-blue-800/40">
              <Square className="w-3 h-3" /> Exit Replay
            </button>
          )}

          {replayMode && (
            <div className="flex-1 flex items-center gap-2">
              <input type="range" min="0" max="100" value={replayProgress}
                onChange={e => setReplayProgress(Number(e.target.value))}
                className="flex-1 h-1 accent-green-500 cursor-pointer" />
              <span className="text-[10px] font-mono text-gray-500 w-10 text-right">{Math.round(replayProgress)}%</span>
            </div>
          )}

          {/* Progress bar when streaming */}
          {streaming && !replayMode && (
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                  style={{ width: `${replayProgress}%` }}
                  transition={{ duration: 0.3 }} />
              </div>
              <span className="text-[10px] font-mono text-gray-500 w-10 text-right">{Math.round(replayProgress)}%</span>
            </div>
          )}
        </div>

        {/* Scan info badge */}
        {loadedScan && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-gray-800/60">
            <Shield className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] font-mono text-gray-400">
              {loadedScan.target?.domain}
            </span>
            <span className={cn(
              'text-[10px] font-mono font-bold',
              loadedScan.riskScore >= 70 ? 'text-red-400' : loadedScan.riskScore >= 40 ? 'text-yellow-400' : 'text-green-400',
            )}>
              {loadedScan.riskScore}/100
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
