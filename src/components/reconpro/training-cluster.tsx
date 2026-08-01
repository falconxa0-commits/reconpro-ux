'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Cpu, HardDrive, Play, Pause, Square, RotateCcw,
  Cloud, DollarSign, TrendingDown, Activity, Layers, GitBranch,
  BarChart3, Clock, Zap, Settings, RefreshCw, CheckCircle,
  XCircle, AlertTriangle, ArrowUp, ArrowDown, ArrowRight, Gauge, MemoryStick,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

type CloudProvider = 'AWS' | 'GCP' | 'Azure';
type GpuType = 'A100' | 'H100';
type NodeStatus = 'online' | 'training' | 'idle' | 'offline';
type JobStatus = 'running' | 'queued' | 'completed' | 'failed';
type ModelStatus = 'training' | 'ready' | 'deployed';

interface GpuNode {
  id: string;
  name: string;
  provider: CloudProvider;
  gpuType: GpuType;
  gpus: number;
  utilization: number;
  status: NodeStatus;
  temperature: number;
  memoryUsed: number;
  memoryTotal: number;
}

interface TrainingJob {
  id: string;
  name: string;
  submitter: string;
  model: string;
  status: JobStatus;
  progress: number;
  gpuHours: number;
  started: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  waitTime?: string;
  estimatedGpuHours?: number;
}

interface ModelEntry {
  id: string;
  name: string;
  version: string;
  status: ModelStatus;
  accuracy: number;
  created: string;
  abTest?: string;
  deployedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Simulated Data Generators
// ═══════════════════════════════════════════════════════════════════════

const PROVIDERS: CloudProvider[] = ['AWS', 'GCP', 'Azure'];
const GPU_TYPES: GpuType[] = ['A100', 'H100'];
const NODE_NAMES = [
  'gpu-node-alpha', 'gpu-node-beta', 'gpu-node-gamma', 'gpu-node-delta',
  'gpu-node-epsilon', 'gpu-node-zeta', 'gpu-node-eta', 'gpu-node-theta',
  'gpu-node-iota', 'gpu-node-kappa', 'gpu-node-lambda', 'gpu-node-mu',
  'gpu-node-nu', 'gpu-node-xi', 'gpu-node-omicron', 'gpu-node-pi',
  'gpu-node-rho', 'gpu-node-sigma', 'gpu-node-tau', 'gpu-node-upsilon',
  'gpu-node-phi', 'gpu-node-chi', 'gpu-node-psi', 'gpu-node-omega',
  'gpu-node-a01', 'gpu-node-b02', 'gpu-node-c03', 'gpu-node-d04',
  'gpu-node-e05', 'gpu-node-f06', 'gpu-node-g07', 'gpu-node-h08',
];

function generateNodes(): GpuNode[] {
  return NODE_NAMES.map((name, i) => {
    const statusRoll = Math.random();
    let status: NodeStatus;
    if (statusRoll < 0.45) status = 'training';
    else if (statusRoll < 0.78) status = 'idle';
    else if (statusRoll < 0.94) status = 'online';
    else status = 'offline';

    return {
      id: `node-${i + 1}`,
      name,
      provider: PROVIDERS[i % 3],
      gpuType: GPU_TYPES[i % 2],
      gpus: i % 2 === 0 ? 8 : 4,
      utilization: status === 'offline' ? 0 : Math.floor(20 + Math.random() * 75),
      status,
      temperature: status === 'offline' ? 0 : Math.floor(35 + Math.random() * 30),
      memoryUsed: status === 'offline' ? 0 : Math.floor(8 + Math.random() * 56),
      memoryTotal: 80,
    };
  });
}

function generateJobs(): TrainingJob[] {
  const activeJobs: TrainingJob[] = [
    { id: 'job-001', name: 'llm-finetune-v3', submitter: 'alice@acme.com', model: 'GPT-NeoX-20B', status: 'running', progress: 72, gpuHours: 186, started: '2h ago', priority: 'high' },
    { id: 'job-002', name: 'embeddings-v2', submitter: 'bob@corp.io', model: 'BGE-large-v2', status: 'running', progress: 45, gpuHours: 64, started: '45m ago', priority: 'medium' },
    { id: 'job-003', name: 'detector-resnet', submitter: 'carol@ml.ai', model: 'ResNet-152', status: 'running', progress: 88, gpuHours: 312, started: '6h ago', priority: 'critical' },
    { id: 'job-004', name: 'sentiment-bert', submitter: 'dave@nlp.com', model: 'BERT-base', status: 'running', progress: 33, gpuHours: 22, started: '15m ago', priority: 'low' },
    { id: 'job-005', name: 'codellama-ft', submitter: 'eve@dev.io', model: 'CodeLlama-34B', status: 'running', progress: 56, gpuHours: 420, started: '8h ago', priority: 'high' },
    { id: 'job-006', name: 'whisper-large', submitter: 'frank@audio.ai', model: 'Whisper-large-v3', status: 'running', progress: 91, gpuHours: 95, started: '3h ago', priority: 'medium' },
    { id: 'job-007', name: 'rlhf-preference', submitter: 'grace@rl.com', model: 'Llama-3-70B', status: 'running', progress: 28, gpuHours: 560, started: '12h ago', priority: 'critical' },
    { id: 'job-008', name: 'sd-finetune', submitter: 'hank@vision.io', model: 'SDXL-1.0', status: 'running', progress: 67, gpuHours: 148, started: '4h ago', priority: 'medium' },
    { id: 'job-009', name: 'ner-transformer', submitter: 'iris@nlp.ai', model: 'DeBERTa-v3', status: 'running', progress: 82, gpuHours: 38, started: '1h ago', priority: 'low' },
    { id: 'job-010', name: 'rag-index-build', submitter: 'jack@search.io', model: 'ColBERT-v2', status: 'running', progress: 51, gpuHours: 76, started: '2h ago', priority: 'medium' },
    { id: 'job-011', name: 'multimodal-align', submitter: 'kate@ml.com', model: 'CLIP-vit-L', status: 'running', progress: 39, gpuHours: 210, started: '5h ago', priority: 'high' },
    { id: 'job-012', name: 'voice-cloner', submitter: 'leo@tts.ai', model: 'XTTS-v2', status: 'running', progress: 74, gpuHours: 52, started: '1h ago', priority: 'medium' },
  ];
  const queuedJobs: TrainingJob[] = [
    { id: 'job-q01', name: 'llama-dpo', submitter: 'alice@acme.com', model: 'Llama-3-8B', status: 'queued', progress: 0, gpuHours: 0, started: '', priority: 'high', waitTime: '~10m', estimatedGpuHours: 180 },
    { id: 'job-q02', name: 'image-gen-ft', submitter: 'bob@corp.io', model: 'SDXL-Turbo', status: 'queued', progress: 0, gpuHours: 0, started: '', priority: 'medium', waitTime: '~25m', estimatedGpuHours: 120 },
    { id: 'job-q03', name: 'asr-whisper', submitter: 'carol@ml.ai', model: 'Whisper-medium', status: 'queued', progress: 0, gpuHours: 0, started: '', priority: 'low', waitTime: '~45m', estimatedGpuHours: 48 },
    { id: 'job-q04', name: 'moja-benchmark', submitter: 'dave@eval.io', model: 'Mixtral-8x7B', status: 'queued', progress: 0, gpuHours: 0, started: '', priority: 'critical', waitTime: '~5m', estimatedGpuHours: 320 },
  ];
  return [...activeJobs, ...queuedJobs];
}

function generateModels(): ModelEntry[] {
  return [
    { id: 'model-001', name: 'ReconGuard-LLM', version: 'v3.2.1', status: 'deployed', accuracy: 96.4, created: '2024-11-15', abTest: 'v3.2.1 vs v3.1.8 — v3.2.1 +2.1% F1', deployedAt: '2024-12-01' },
    { id: 'model-002', name: 'ThreatClassifier', version: 'v2.1.0', status: 'deployed', accuracy: 94.8, created: '2024-10-20', deployedAt: '2024-11-10' },
    { id: 'model-003', name: 'VulnPredictor', version: 'v1.5.0-rc', status: 'training', accuracy: 0, created: '2024-12-05' },
    { id: 'model-004', name: 'PhishDetector', version: 'v4.0.0-beta', status: 'ready', accuracy: 97.2, created: '2024-11-28', abTest: 'v4.0.0 vs v3.9.2 — pending' },
    { id: 'model-005', name: 'CodeAuditAI', version: 'v2.3.0', status: 'deployed', accuracy: 91.5, created: '2024-09-15', deployedAt: '2024-10-05' },
    { id: 'model-006', name: 'NetworkAnomaly', version: 'v1.8.0', status: 'training', accuracy: 0, created: '2024-12-08' },
    { id: 'model-007', name: 'MalwareEmbed', version: 'v3.0.0-alpha', status: 'ready', accuracy: 93.1, created: '2024-12-01' },
    { id: 'model-008', name: 'EntitlementScan', version: 'v1.2.0', status: 'deployed', accuracy: 89.7, created: '2024-08-20', abTest: 'v1.2.0 vs v1.1.0 — v1.2.0 +3.4%', deployedAt: '2024-09-01' },
  ];
}

function generateLossData(): number[] {
  const data: number[] = [];
  let loss = 2.8;
  for (let i = 0; i < 40; i++) {
    loss -= 0.04 + Math.random() * 0.03;
    loss = Math.max(0.12, loss);
    data.push(parseFloat(loss.toFixed(4)));
  }
  return data;
}

function generateUtilData(): number[] {
  return Array.from({ length: 24 }, () => Math.floor(55 + Math.random() * 35));
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const STATUS_COLORS: Record<NodeStatus, string> = {
  online: '#22c55e',
  training: '#3b82f6',
  idle: '#94a3b8',
  offline: '#ef4444',
};

const PROVIDER_COLORS: Record<CloudProvider, string> = {
  AWS: '#ff9900',
  GCP: '#4285f4',
  Azure: '#0078d4',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export function TrainingClusterPanel() {
  const [nodes] = useState<GpuNode[]>(() => generateNodes());
  const [jobs, setJobs] = useState<TrainingJob[]>(() => generateJobs());
  const models = useMemo(() => generateModels(), []);
  const lossData = useMemo(() => generateLossData(), []);
  const utilData = useMemo(() => generateUtilData(), []);
  const [animatedUtil, setAnimatedUtil] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'jobs' | 'monitoring' | 'models' | 'cost'>('overview');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Animated GPU utilization gauge
  useEffect(() => {
    const target = 78;
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedUtil(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  // Uptime counter
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Derived stats
  const onlineNodes = nodes.filter(n => n.status !== 'offline');
  const offlineNodes = nodes.filter(n => n.status === 'offline');
  const totalGpus = nodes.reduce((sum, n) => sum + (n.status !== 'offline' ? n.gpus : 0), 0);
  const activeJobs = jobs.filter(j => j.status === 'running');
  const queuedJobs = jobs.filter(j => j.status === 'queued');
  const totalGpuHours = jobs.reduce((sum, j) => sum + j.gpuHours, 0);

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${d}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleCancelJob = (jobId: string) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'failed' as JobStatus } : j));
  };

  const handleRestartJob = (jobId: string) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'running' as JobStatus, progress: 0 } : j));
  };

  // ── Arc Gauge SVG ──
  const GaugeArc = ({ value, size = 120 }: { value: number; size?: number }) => {
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 12;
    const circumference = 2 * Math.PI * radius;
    const arcLength = (value / 100) * circumference;
    const dashOffset = circumference - arcLength;
    const color = value > 85 ? '#ef4444' : value > 65 ? '#f59e0b' : '#3b82f6';

    return (
      <svg width={size} height={size} className="drop-shadow-lg">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">{value}%</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="#94a3b8" fontSize="10">UTILIZATION</text>
      </svg>
    );
  };

  // ── Loss Curve SVG ──
  const LossChart = ({ data }: { data: number[] }) => {
    const w = 600;
    const h = 180;
    const padding = 30;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;
    const minVal = Math.min(...data) * 0.9;
    const maxVal = Math.max(...data) * 1.05;

    const points = data.map((v, i) => {
      const x = padding + (i / (data.length - 1)) * chartW;
      const y = padding + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
      return `${x},${y}`;
    });

    const areaPath = `M ${padding},${padding + chartH} L ${points.join(' L ')} L ${padding + chartW},${padding + chartH} Z`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <defs>
          <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lossGrad)" />
        <polyline points={points.join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />
        {data.map((v, i) => {
          if (i % 5 !== 0 && i !== data.length - 1) return null;
          const x = padding + (i / (data.length - 1)) * chartW;
          const y = padding + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
          return <circle key={i} cx={x} cy={y} r="3" fill="#8b5cf6" />;
        })}
        <text x={padding} y={h - 4} fill="#64748b" fontSize="10">Epoch</text>
        <text x={2} y={padding + 8} fill="#64748b" fontSize="10" transform="rotate(-90)">Loss</text>
      </svg>
    );
  };

  // ── Utilization Area Chart SVG ──
  const UtilChart = ({ data }: { data: number[] }) => {
    const w = 600;
    const h = 180;
    const padding = 30;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;

    const points = data.map((v, i) => {
      const x = padding + (i / (data.length - 1)) * chartW;
      const y = padding + chartH - (v / 100) * chartH;
      return `${x},${y}`;
    });

    const areaPath = `M ${padding},${padding + chartH} L ${points.join(' L ')} L ${padding + chartW},${padding + chartH} Z`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <defs>
          <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#utilGrad)" />
        <polyline points={points.join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
        <text x={padding} y={h - 4} fill="#64748b" fontSize="10">Hour (24h)</text>
        <text x={2} y={padding + 8} fill="#64748b" fontSize="10" transform="rotate(-90)">GPU %</text>
      </svg>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <Activity size={14} /> },
    { id: 'nodes' as const, label: 'GPU Nodes', icon: <Server size={14} /> },
    { id: 'jobs' as const, label: 'Job Queue', icon: <Play size={14} /> },
    { id: 'monitoring' as const, label: 'Monitoring', icon: <BarChart3 size={14} /> },
    { id: 'models' as const, label: 'Models', icon: <Layers size={14} /> },
    { id: 'cost' as const, label: 'Costs', icon: <DollarSign size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* ── Header ── */}
      <div className="border-b border-white/5 bg-[#0d1220]">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Cpu size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Training Cluster</h1>
              <p className="text-xs text-slate-500">Multi-tenant GPU Orchestration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock size={12} />
              <span>Uptime: {formatUptime(elapsed)}</span>
            </div>
            {(['AWS', 'GCP', 'Azure'] as CloudProvider[]).map(p => (
              <span key={p} className="px-2 py-0.5 rounded text-[10px] font-bold border"
                style={{ color: PROVIDER_COLORS[p], borderColor: `${PROVIDER_COLORS[p]}40`, backgroundColor: `${PROVIDER_COLORS[p]}15` }}>
                {p}
              </span>
            ))}
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Settings size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-white/5 bg-[#0d1220]/80">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

            {/* ══════════ OVERVIEW TAB ══════════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Hero Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total GPUs', value: '256', icon: <Cpu size={18} className="text-blue-400" />, color: 'from-blue-500/10 to-transparent' },
                    { label: 'Active Jobs', value: activeJobs.length.toString(), icon: <Play size={18} className="text-green-400" />, color: 'from-green-500/10 to-transparent' },
                    { label: 'Queued Jobs', value: queuedJobs.length.toString(), icon: <Clock size={18} className="text-yellow-400" />, color: 'from-yellow-500/10 to-transparent' },
                    { label: 'Nodes Online', value: `${onlineNodes.length}`, icon: <Server size={18} className="text-emerald-400" />, color: 'from-emerald-500/10 to-transparent' },
                    { label: 'Nodes Offline', value: `${offlineNodes.length}`, icon: <XCircle size={18} className="text-red-400" />, color: 'from-red-500/10 to-transparent' },
                    { label: 'GPU Hours', value: totalGpuHours.toLocaleString(), icon: <Gauge size={18} className="text-purple-400" />, color: 'from-purple-500/10 to-transparent' },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className={`bg-gradient-to-br ${stat.color} rounded-xl border border-white/5 p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500">{stat.label}</span>
                        {stat.icon}
                      </div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* GPU Utilization Gauge + Cloud Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-[#111827] rounded-xl border border-white/5 p-6 flex flex-col items-center">
                    <h3 className="text-sm font-semibold text-slate-400 mb-4">GPU Utilization</h3>
                    <GaugeArc value={animatedUtil} size={140} />
                    <div className="mt-4 flex gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Healthy</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Training</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> High</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Error</span>
                    </div>
                  </motion.div>

                  <div className="lg:col-span-2 bg-[#111827] rounded-xl border border-white/5 p-6">
                    <h3 className="text-sm font-semibold text-slate-400 mb-4">Cloud Distribution</h3>
                    <div className="space-y-4">
                      {PROVIDERS.map(p => {
                        const providerNodes = nodes.filter(n => n.provider === p && n.status !== 'offline');
                        const providerGpus = providerNodes.reduce((s, n) => s + n.gpus, 0);
                        const pct = totalGpus > 0 ? Math.round((providerGpus / totalGpus) * 100) : 0;
                        return (
                          <div key={p}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Cloud size={14} style={{ color: PROVIDER_COLORS[p] }} />
                                <span className="text-sm font-medium">{p}</span>
                                <span className="text-xs text-slate-500">{providerNodes.length} nodes</span>
                              </div>
                              <span className="text-sm font-bold" style={{ color: PROVIDER_COLORS[p] }}>{providerGpus} GPUs ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="h-full rounded-full" style={{ backgroundColor: PROVIDER_COLORS[p] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <div className="bg-white/3 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-blue-400">{nodes.filter(n => n.gpuType === 'A100').length}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">A100 Nodes</p>
                      </div>
                      <div className="bg-white/3 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-purple-400">{nodes.filter(n => n.gpuType === 'H100').length}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">H100 Nodes</p>
                      </div>
                      <div className="bg-white/3 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-green-400">{nodes.filter(n => n.status === 'training').length}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Training</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ NODES TAB ══════════ */}
            {activeTab === 'nodes' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-400">{nodes.length} GPU Nodes</h3>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors">
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {nodes.map((node, i) => (
                    <motion.div key={node.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={`relative bg-[#111827] rounded-xl border p-4 transition-all cursor-default ${
                        hoveredNode === node.id ? 'border-blue-500/40 shadow-lg shadow-blue-500/5' : 'border-white/5'
                      }`}>
                      {/* Status dot */}
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: STATUS_COLORS[node.status] }} />
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                          style={{ color: PROVIDER_COLORS[node.provider], borderColor: `${PROVIDER_COLORS[node.provider]}40`, backgroundColor: `${PROVIDER_COLORS[node.provider]}15` }}>
                          {node.provider}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
                          {node.gpuType}
                        </span>
                        <span className="text-[10px] text-slate-500">{node.gpus}x GPU</span>
                      </div>
                      <p className="text-sm font-medium truncate mb-3">{node.name}</p>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                            <span>Utilization</span><span>{node.utilization}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{
                              width: `${node.utilization}%`,
                              backgroundColor: node.utilization > 80 ? '#ef4444' : node.utilization > 60 ? '#f59e0b' : STATUS_COLORS[node.status],
                            }} />
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 flex items-center gap-1"><Activity size={10} /> {node.temperature}°C</span>
                          <span className="text-slate-500 flex items-center gap-1"><MemoryStick size={10} /> {node.memoryUsed}/{node.memoryTotal} GB</span>
                        </div>
                      </div>
                      {/* Hover tooltip */}
                      <AnimatePresence>
                        {hoveredNode === node.id && (
                          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                            className="absolute inset-0 rounded-xl bg-[#111827]/95 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                            <p className="text-sm font-bold mb-2">{node.name}</p>
                            <div className="text-xs text-slate-400 space-y-1 text-center">
                              <p>Status: <span className="font-medium capitalize" style={{ color: STATUS_COLORS[node.status] }}>{node.status}</span></p>
                              <p>GPU: {node.gpuType} × {node.gpus}</p>
                              <p>Temp: {node.temperature}°C</p>
                              <p>Memory: {node.memoryUsed}/{node.memoryTotal} GB</p>
                              <p>Provider: {node.provider}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════ JOBS TAB ══════════ */}
            {activeTab === 'jobs' && (
              <div className="space-y-6">
                {/* Active Jobs */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                    <Play size={14} className="text-green-400" /> Active Jobs ({activeJobs.length})
                  </h3>
                  <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                            <th className="text-left px-4 py-3 font-medium">Job</th>
                            <th className="text-left px-4 py-3 font-medium">Submitter</th>
                            <th className="text-left px-4 py-3 font-medium">Model</th>
                            <th className="text-left px-4 py-3 font-medium">Progress</th>
                            <th className="text-left px-4 py-3 font-medium">GPU Hours</th>
                            <th className="text-left px-4 py-3 font-medium">Started</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobs.filter(j => j.status === 'running').map(job => (
                            <tr key={job.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                              <td className="px-4 py-3 font-medium">{job.name}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{job.submitter}</td>
                              <td className="px-4 py-3 text-xs">{job.model}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${job.progress}%` }}
                                      transition={{ duration: 0.6 }} className="h-full bg-blue-500 rounded-full" />
                                  </div>
                                  <span className="text-xs text-slate-400 w-8">{job.progress}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400">{job.gpuHours}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">{job.started}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleCancelJob(job.id)}
                                    className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors" title="Cancel">
                                    <Square size={13} />
                                  </button>
                                  <button onClick={() => handleRestartJob(job.id)}
                                    className="p-1.5 rounded-md hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-colors" title="Restart">
                                    <RotateCcw size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Queued Jobs */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                    <Clock size={14} className="text-yellow-400" /> Queued Jobs ({queuedJobs.length})
                  </h3>
                  <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                            <th className="text-left px-4 py-3 font-medium">Job</th>
                            <th className="text-left px-4 py-3 font-medium">Model</th>
                            <th className="text-left px-4 py-3 font-medium">Priority</th>
                            <th className="text-left px-4 py-3 font-medium">Est. GPU Hours</th>
                            <th className="text-left px-4 py-3 font-medium">Wait Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobs.filter(j => j.status === 'queued').map(job => (
                            <tr key={job.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                              <td className="px-4 py-3 font-medium">{job.name}</td>
                              <td className="px-4 py-3 text-xs text-slate-400">{job.model}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${PRIORITY_COLORS[job.priority]}`}>
                                  {job.priority}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400">{job.estimatedGpuHours}</td>
                              <td className="px-4 py-3 text-xs text-yellow-400">{job.waitTime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ MONITORING TAB ══════════ */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Loss Curve */}
                  <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-400">Training Loss Curve</h3>
                      <span className="text-xs text-purple-400 flex items-center gap-1"><TrendingDown size={12} /> Decreasing</span>
                    </div>
                    <LossChart data={lossData} />
                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                      <span>Current: {lossData[lossData.length - 1]}</span>
                      <span>Start: {lossData[0]}</span>
                      <span>Min: {Math.min(...lossData)}</span>
                    </div>
                  </div>

                  {/* GPU Utilization over Time */}
                  <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-400">GPU Utilization (24h)</h3>
                      <span className="text-xs text-blue-400 flex items-center gap-1"><Activity size={12} /> Live</span>
                    </div>
                    <UtilChart data={utilData} />
                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                      <span>Avg: {Math.round(utilData.reduce((a, b) => a + b) / utilData.length)}%</span>
                      <span>Peak: {Math.max(...utilData)}%</span>
                      <span>Low: {Math.min(...utilData)}%</span>
                    </div>
                  </div>
                </div>

                {/* Memory Usage Per Job */}
                <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                  <h3 className="text-sm font-semibold text-slate-400 mb-4">Memory Usage Per Job</h3>
                  <div className="space-y-3">
                    {jobs.filter(j => j.status === 'running').slice(0, 8).map((job, i) => {
                      const mem = Math.floor(4 + Math.random() * 52);
                      return (
                        <div key={job.id} className="flex items-center gap-4">
                          <span className="text-xs text-slate-400 w-36 truncate">{job.name}</span>
                          <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(mem / 80) * 100}%` }}
                              transition={{ duration: 0.5, delay: i * 0.05 }}
                              className="h-full rounded-full" style={{
                                backgroundColor: mem > 60 ? '#ef4444' : mem > 40 ? '#f59e0b' : '#3b82f6',
                              }} />
                          </div>
                          <span className="text-xs text-slate-400 w-16 text-right">{mem} GB</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ MODELS TAB ══════════ */}
            {activeTab === 'models' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                  <Layers size={14} className="text-purple-400" /> Model Registry ({models.length})
                </h3>
                <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                          <th className="text-left px-4 py-3 font-medium">Model</th>
                          <th className="text-left px-4 py-3 font-medium">Version</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                          <th className="text-left px-4 py-3 font-medium">Accuracy</th>
                          <th className="text-left px-4 py-3 font-medium">A/B Test</th>
                          <th className="text-left px-4 py-3 font-medium">Created</th>
                          <th className="text-right px-4 py-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map(model => {
                          const statusColor = model.status === 'deployed' ? 'text-green-400' : model.status === 'ready' ? 'text-blue-400' : 'text-yellow-400';
                          const statusIcon = model.status === 'deployed' ? <CheckCircle size={12} /> : model.status === 'ready' ? <Zap size={12} /> : <RefreshCw size={12} className="animate-spin" />;
                          return (
                            <tr key={model.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                              <td className="px-4 py-3 font-medium">{model.name}</td>
                              <td className="px-4 py-3 text-xs font-mono text-slate-400">{model.version}</td>
                              <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 text-xs font-medium capitalize ${statusColor}`}>
                                  {statusIcon} {model.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {model.accuracy > 0 ? (
                                  <span className="font-medium" style={{ color: model.accuracy >= 95 ? '#22c55e' : model.accuracy >= 90 ? '#3b82f6' : '#f59e0b' }}>
                                    {model.accuracy}%
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {model.abTest ? (
                                  <span className="flex items-center gap-1 text-purple-400" title={model.abTest}>
                                    <GitBranch size={12} /> Active
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">{model.created}</td>
                              <td className="px-4 py-3 text-right">
                                {model.status === 'ready' || model.status === 'deployed' ? (
                                  <button className="px-3 py-1 rounded-md bg-blue-500/15 text-blue-400 text-[11px] font-medium border border-blue-500/20 hover:bg-blue-500/25 transition-colors flex items-center gap-1 ml-auto">
                                    <Play size={10} /> Deploy
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-600">Training…</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ COST TAB ══════════ */}
            {activeTab === 'cost' && (
              <div className="space-y-6">
                {/* Current Spend */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-500/10 to-transparent rounded-xl border border-white/5 p-5">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Current Monthly Spend</p>
                    <p className="text-3xl font-bold">$48,720</p>
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1"><ArrowUp size={12} /> +12% vs last month</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="bg-gradient-to-br from-green-500/10 to-transparent rounded-xl border border-white/5 p-5">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Spot Savings</p>
                    <p className="text-3xl font-bold text-green-400">$14,616</p>
                    <p className="text-xs text-green-400 flex items-center gap-1 mt-1"><TrendingDown size={12} /> 30% saved with spot</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl border border-white/5 p-5">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Cost per GPU Hour</p>
                    <p className="text-3xl font-bold text-purple-400">$2.84</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><ArrowDown size={12} /> -$0.18 vs avg</p>
                  </motion.div>
                </div>

                {/* Spot vs On-Demand Breakdown */}
                <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                  <h3 className="text-sm font-semibold text-slate-400 mb-4">Spot vs On-Demand Breakdown</h3>
                  <div className="space-y-4">
                    {[
                      { type: 'On-Demand', pct: 70, spend: '$34,104', color: '#3b82f6', gpus: 180 },
                      { type: 'Spot', pct: 22, spend: '$10,718', color: '#22c55e', gpus: 56 },
                      { type: 'Reserved', pct: 8, spend: '$3,898', color: '#8b5cf6', gpus: 20 },
                    ].map(item => (
                      <div key={item.type}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.type}</span>
                            <span className="text-xs text-slate-500">{item.gpus} GPUs</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold" style={{ color: item.color }}>{item.pct}%</span>
                            <span className="text-xs text-slate-400">{item.spend}</span>
                          </div>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                            transition={{ duration: 0.8 }} className="h-full rounded-full"
                            style={{ backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optimization Recommendations */}
                <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
                  <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                    <Zap size={14} className="text-yellow-400" /> Optimization Recommendations
                  </h3>
                  <div className="space-y-3">
                    {[
                      { title: 'Migrate 4 idle nodes to spot instances', savings: '~$2,400/mo', impact: 'high', icon: <DollarSign size={14} className="text-green-400" /> },
                      { title: 'Enable automatic checkpointing for spot preemption', savings: '~$800/mo', impact: 'medium', icon: <Settings size={14} className="text-blue-400" /> },
                      { title: 'Consolidate low-utilization jobs to fewer nodes', savings: '~$1,600/mo', impact: 'high', icon: <TrendingDown size={14} className="text-purple-400" /> },
                      { title: 'Preemptible instance fallback strategy for critical jobs', savings: '~$1,200/mo', impact: 'medium', icon: <Zap size={14} className="text-yellow-400" /> },
                    ].map((rec, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/2 hover:bg-white/4 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">{rec.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{rec.title}</p>
                          <p className="text-xs text-green-400">Potential savings: {rec.savings}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          rec.impact === 'high' ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                        }`}>{rec.impact}</span>
                        <button className="p-1.5 rounded-md hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-colors">
                          <ArrowRight size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
