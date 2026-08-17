'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldAlert, ShieldCheck, Server, Cpu, Radio, AlertTriangle, Network, Globe,
  Lock, Unlock, FileText, Download, Eye, Target, Crosshair, Radar, Activity, Zap,
  Terminal, Database, Factory, Skull, ChevronDown, ChevronRight, ArrowRight,
  CheckCircle, XCircle, Clock, MapPin, Bug, Layers,
} from 'lucide-react';
import type {
  CNIAnalysisResult, NetworkSegment, Industry, DeviceInfo,
} from '@/lib/cni-sentinel-engine';

// ── Constants ────────────────────────────────────────────────────────────────

const BG = '#0a1628';
const GREEN = '#00ff41';
const RED = '#ff3333';
const AMBER = '#ffaa00';
const BLUE = '#00aaff';
const DIM = '#1a2a44';

const SEGMENTS: { value: NetworkSegment; label: string }[] = [
  { value: 'scada', label: 'SCADA Zone' },
  { value: 'plc', label: 'PLC Zone' },
  { value: 'hmi', label: 'HMI Zone' },
  { value: 'dcs', label: 'DCS Zone' },
  { value: 'enterprise', label: 'Enterprise IT' },
  { value: 'dmz', label: 'Industrial DMZ' },
];

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'energy', label: '⚡ Energy Grid' },
  { value: 'water', label: '💧 Water Systems' },
  { value: 'transportation', label: '🚂 Transportation' },
  { value: 'telecom', label: '📡 Telecommunications' },
  { value: 'defense', label: '🛡️ Defense' },
  { value: 'manufacturing', label: '🏭 Manufacturing' },
];

const DEFCON_MAP: Record<string, { level: number; color: string; bg: string; label: string }> = {
  CRITICAL: { level: 1, color: RED, bg: 'rgba(255,51,51,0.15)', label: 'DEFCON 1' },
  HIGH: { level: 2, color: '#ff6644', bg: 'rgba(255,102,68,0.12)', label: 'DEFCON 2' },
  ELEVATED: { level: 3, color: AMBER, bg: 'rgba(255,170,0,0.10)', label: 'DEFCON 3' },
  MODERATE: { level: 4, color: '#44bbff', bg: 'rgba(68,187,255,0.08)', label: 'DEFCON 4' },
  LOW: { level: 5, color: GREEN, bg: 'rgba(0,255,65,0.06)', label: 'DEFCON 5' },
};

// ── Component ────────────────────────────────────────────────────────────────

export function CNISentinelPanel() {
  const [segment, setSegment] = useState<NetworkSegment>('scada');
  const [industry, setIndustry] = useState<Industry>('energy');
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>(['modbus_tcp', 'dnp3', 's7comm', 'profinet']);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [results, setResults] = useState<CNIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [protocols, setProtocols] = useState<Array<{ key: string; name: string; port: number | null; risk: string }>>([]);
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'firmware' | 'reports'>('overview');

  // Fetch available protocols on mount
  useEffect(() => {
    fetch('/api/cni-sentinel?resource=protocols')
      .then(r => r.json())
      .then(d => { if (d.protocols) setProtocols(d.protocols); })
      .catch(() => {});
  }, []);

  const toggleProtocol = useCallback((key: string) => {
    setSelectedProtocols(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  }, []);

  const runAnalysis = useCallback(async () => {
    if (selectedProtocols.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/cni-sentinel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          networkSegment: segment,
          industry,
          protocols: selectedProtocols,
          devices: devices.length > 0 ? devices : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) setResults(data);
    } catch { /* silent */ }
    setLoading(false);
  }, [segment, industry, selectedProtocols, devices]);

  const downloadReport = useCallback(async (type: 'stix' | 'iodef') => {
    const resource = type === 'stix' ? 'stix-report' : 'iodef-report';
    const url = `/api/cni-sentinel?resource=${resource}&networkSegment=${segment}&industry=${industry}&protocols=${selectedProtocols.join(',')}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'stix' ? 'cni-stix-report.json' : 'cni-iodef-report.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [segment, industry, selectedProtocols]);

  const defcon = results ? DEFCON_MAP[results.threatLevel] : DEFCON_MAP.LOW;
  const isCritical = results?.threatLevel === 'CRITICAL';

  // ── Network Topology Nodes (simplified inline) ──
  const topoNodes = [
    { id: 'internet', label: 'INTERNET', x: 350, y: 30, type: 'network' as const, zone: 'external', vuln: false },
    { id: 'fw1', label: 'FW-EXT', x: 350, y: 80, type: 'firewall' as const, zone: 'dmz', vuln: false },
    { id: 'enterprise', label: 'ENTERPRISE IT', x: 160, y: 150, type: 'network' as const, zone: 'enterprise', vuln: false },
    { id: 'dmz', label: 'INDUSTRIAL DMZ', x: 350, y: 150, type: 'network' as const, zone: 'dmz', vuln: false },
    { id: 'historian', label: 'Historian', x: 540, y: 150, type: 'device' as const, zone: 'dmz', vuln: false },
    { id: 'fw2', label: 'FW-OT', x: 350, y: 220, type: 'firewall' as const, zone: 'scada', vuln: false },
    { id: 'scada', label: 'SCADA ZONE', x: 250, y: 300, type: 'network' as const, zone: 'scada', vuln: false },
    { id: 'hmi1', label: 'HMI-01', x: 130, y: 360, type: 'device' as const, zone: 'scada', vuln: false },
    { id: 'eng_ws', label: 'Eng WS', x: 370, y: 360, type: 'device' as const, zone: 'scada', vuln: false },
    { id: 'fw3', label: 'FW-FIELD', x: 250, y: 420, type: 'firewall' as const, zone: 'plc', vuln: false },
    { id: 'plc_zone', label: 'PLC ZONE', x: 250, y: 480, type: 'network' as const, zone: 'plc', vuln: false },
    { id: 'plc1', label: 'PLC-01', x: 100, y: 540, type: 'device' as const, zone: 'plc', vuln: results?.networkSegmentation.score !== undefined && results.networkSegmentation.score < 70 },
    { id: 'plc2', label: 'PLC-02', x: 250, y: 540, type: 'device' as const, zone: 'plc', vuln: false },
    { id: 'rtu1', label: 'RTU-01', x: 400, y: 540, type: 'device' as const, zone: 'plc', vuln: results?.protocolAnalysis.some(p => p.protocol.includes('DNP3')) || false },
    { id: 'field', label: 'FIELD', x: 550, y: 480, type: 'network' as const, zone: 'field', vuln: false },
    { id: 'sensor1', label: 'Sensors', x: 510, y: 540, type: 'device' as const, zone: 'field', vuln: false },
    { id: 'actuator1', label: 'Actuators', x: 620, y: 540, type: 'device' as const, zone: 'field', vuln: results?.overallScore !== undefined && results.overallScore > 60 },
  ];

  const topoEdges = [
    ['internet', 'fw1'], ['fw1', 'enterprise'], ['fw1', 'dmz'], ['dmz', 'historian'],
    ['dmz', 'fw2'], ['enterprise', 'dmz'], ['fw2', 'scada'], ['scada', 'hmi1'],
    ['scada', 'eng_ws'], ['scada', 'fw3'], ['fw3', 'plc_zone'], ['plc_zone', 'plc1'],
    ['plc_zone', 'plc2'], ['plc_zone', 'rtu1'], ['plc_zone', 'field'], ['field', 'sensor1'],
    ['field', 'actuator1'],
  ];

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: BG, color: '#c8d6e5' }}>
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 mb-2">
        <ShieldAlert className="w-7 h-7" style={{ color: RED }} />
        <h1 className="text-2xl font-bold tracking-widest" style={{ color: GREEN, fontFamily: 'monospace' }}>
          CNI THREAT SENTINEL
        </h1>
        <div className="flex-1" />
        <span className="text-xs px-2 py-1 rounded" style={{ background: DIM, color: '#667' }}>
          <Radar className="w-3 h-3 inline mr-1" />CRITICAL NATIONAL INFRASTRUCTURE MONITORING
        </span>
      </div>

      {/* ── CONFIG PANEL ── */}
      <div className="rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
        {/* Segment */}
        <div>
          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#556' }}>
            <Network className="w-3 h-3 inline mr-1" />Network Segment
          </label>
          <select
            value={segment}
            onChange={e => setSegment(e.target.value as NetworkSegment)}
            className="w-full rounded px-3 py-2 text-sm"
            style={{ background: '#0d1f38', border: `1px solid ${DIM}`, color: '#c8d6e5' }}
          >
            {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {/* Industry */}
        <div>
          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#556' }}>
            <Factory className="w-3 h-3 inline mr-1" />Industry Sector
          </label>
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value as Industry)}
            className="w-full rounded px-3 py-2 text-sm"
            style={{ background: '#0d1f38', border: `1px solid ${DIM}`, color: '#c8d6e5' }}
          >
            {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        {/* Analyze button */}
        <div className="flex items-end">
          <button
            onClick={runAnalysis}
            disabled={loading || selectedProtocols.length === 0}
            className="w-full rounded px-4 py-2 text-sm font-bold tracking-wider transition-all"
            style={{
              background: loading ? DIM : isCritical ? 'rgba(255,51,51,0.2)' : 'rgba(0,255,65,0.15)',
              border: `1px solid ${loading ? DIM : isCritical ? RED : GREEN}`,
              color: loading ? '#556' : isCritical ? RED : GREEN,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Activity className="w-4 h-4 animate-spin" /> ANALYZING...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Crosshair className="w-4 h-4" /> RUN THREAT ANALYSIS
              </span>
            )}
          </button>
        </div>

        {/* Protocol Selector */}
        <div className="md:col-span-3">
          <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: '#556' }}>
            <Radio className="w-3 h-3 inline mr-1" />Active Protocols
          </label>
          <div className="flex flex-wrap gap-2">
            {protocols.map(p => (
              <button
                key={p.key}
                onClick={() => toggleProtocol(p.key)}
                className="px-3 py-1 rounded text-xs font-mono transition-all"
                style={{
                  background: selectedProtocols.includes(p.key) ? (p.risk === 'critical' ? 'rgba(255,51,51,0.2)' : p.risk === 'high' ? 'rgba(255,170,0,0.15)' : 'rgba(0,170,255,0.15)') : 'transparent',
                  border: `1px solid ${selectedProtocols.includes(p.key) ? (p.risk === 'critical' ? RED : p.risk === 'high' ? AMBER : BLUE) : DIM}`,
                  color: selectedProtocols.includes(p.key) ? (p.risk === 'critical' ? RED : p.risk === 'high' ? AMBER : BLUE) : '#445',
                }}
              >
                {p.name}{p.port ? ` :${p.port}` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LOADING STATE ── */}
      {loading && (
        <motion.div
          className="rounded-lg p-8 text-center"
          style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <Radar className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: GREEN }} />
          <p className="font-mono text-sm" style={{ color: GREEN }}>SCANNING CNI INFRASTRUCTURE...</p>
          <p className="text-xs mt-1" style={{ color: '#445' }}>Analyzing {selectedProtocols.length} protocol(s) across {segment} / {industry}</p>
        </motion.div>
      )}

      {/* ── RESULTS ── */}
      {results && !loading && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* ═══ A. DEFCON THREAT LEVEL INDICATOR ═══ */}
            <div
              className="rounded-lg p-6 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${defcon.bg}, ${BG})`,
                border: `2px solid ${defcon.color}`,
                boxShadow: isCritical ? `0 0 30px rgba(255,51,51,0.3), inset 0 0 30px rgba(255,51,51,0.05)` : 'none',
              }}
            >
              {isCritical && (
                <motion.div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{ border: `2px solid ${RED}` }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <div className="flex items-center gap-8 relative z-10">
                {/* DEFCON Level */}
                <div className="text-center">
                  <div
                    className="w-28 h-28 rounded-full flex flex-col items-center justify-center"
                    style={{
                      border: `3px solid ${defcon.color}`,
                      background: `radial-gradient(circle, ${defcon.bg}, transparent)`,
                    }}
                  >
                    <span className="text-xs font-mono tracking-widest" style={{ color: defcon.color }}>{defcon.label}</span>
                    <span className="text-4xl font-black" style={{ color: defcon.color }}>{defcon.level}</span>
                  </div>
                </div>
                {/* Score & Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl font-black tracking-wider" style={{ color: defcon.color, fontFamily: 'monospace' }}>
                      {results.threatLevel}
                    </span>
                    <span className="text-sm px-2 py-0.5 rounded" style={{ background: DIM, color: '#889' }}>
                      SCORE: {results.overallScore}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div className="rounded p-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="text-xs" style={{ color: '#556' }}>APT THREATS</div>
                      <div className="text-lg font-bold" style={{ color: results.aptAssessment.activeThreats.length > 0 ? RED : GREEN }}>
                        {results.aptAssessment.activeThreats.length}
                      </div>
                    </div>
                    <div className="rounded p-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="text-xs" style={{ color: '#556' }}>VULN PROTOCOLS</div>
                      <div className="text-lg font-bold" style={{ color: results.protocolAnalysis.filter(p => p.risk === 'critical').length > 0 ? RED : AMBER }}>
                        {results.protocolAnalysis.filter(p => p.risk !== 'low').length}/{results.protocolAnalysis.length}
                      </div>
                    </div>
                    <div className="rounded p-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="text-xs" style={{ color: '#556' }}>SEGMENTATION</div>
                      <div className="text-lg font-bold" style={{ color: results.networkSegmentation.score >= 80 ? GREEN : results.networkSegmentation.score >= 50 ? AMBER : RED }}>
                        {results.networkSegmentation.score}%
                      </div>
                    </div>
                    <div className="rounded p-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="text-xs" style={{ color: '#556' }}>MITRE COVERAGE</div>
                      <div className="text-lg font-bold" style={{ color: BLUE }}>
                        {results.mitreAttackMapping.coverageScore}%
                      </div>
                    </div>
                  </div>
                </div>
                {/* APT Targets */}
                <div className="hidden lg:block text-right">
                  <div className="text-xs" style={{ color: '#556' }}>ACTIVE APT GROUPS</div>
                  <div className="mt-1 space-y-1">
                    {results.aptAssessment.activeThreats.slice(0, 4).map(apt => (
                      <div key={apt.id} className="flex items-center gap-2 justify-end">
                        <span className="text-xs font-mono" style={{ color: apt.severity === 'critical' ? RED : AMBER }}>{apt.id}</span>
                        <MapPin className="w-3 h-3" style={{ color: '#556' }} />
                        <span className="text-xs" style={{ color: '#778' }}>{apt.origin}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ TABS ═══ */}
            <div className="flex gap-1 rounded-lg p-1" style={{ background: DIM }}>
              {([['overview', Layers], ['compliance', ShieldCheck], ['firmware', Cpu], ['reports', FileText]] as const).map(([tab, Icon]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 flex items-center justify-center gap-2 rounded px-3 py-2 text-xs font-mono tracking-wider transition-all"
                  style={{
                    background: activeTab === tab ? 'rgba(0,255,65,0.1)' : 'transparent',
                    color: activeTab === tab ? GREEN : '#556',
                    border: activeTab === tab ? `1px solid rgba(0,255,65,0.3)` : '1px solid transparent',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />{tab.toUpperCase()}
                </button>
              ))}
            </div>

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* B. NETWORK TOPOLOGY */}
                <div className="rounded-lg p-4" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Network className="w-4 h-4" style={{ color: GREEN }} />
                    <span className="text-xs font-mono tracking-wider" style={{ color: GREEN }}>NETWORK TOPOLOGY</span>
                  </div>
                  <svg viewBox="0 0 700 600" className="w-full" style={{ maxHeight: '420px' }}>
                    {/* Grid */}
                    <defs>
                      <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0,255,65,0.04)" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="700" height="600" fill="url(#grid)" />
                    {/* Edges */}
                    {topoEdges.map(([fromId, toId]) => {
                      const from = topoNodes.find(n => n.id === fromId)!;
                      const to = topoNodes.find(n => n.id === toId)!;
                      const isHighlighted = hoveredNode === fromId || hoveredNode === toId;
                      return (
                        <line
                          key={`${fromId}-${toId}`}
                          x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                          stroke={isHighlighted ? GREEN : 'rgba(0,255,65,0.15)'}
                          strokeWidth={isHighlighted ? 1.5 : 0.8}
                          strokeDasharray={fromId.includes('fw') ? '4,4' : 'none'}
                        />
                      );
                    })}
                    {/* Nodes */}
                    {topoNodes.map(node => {
                      const isHovered = hoveredNode === node.id;
                      const nodeColor = node.vuln ? RED : node.type === 'firewall' ? AMBER : node.type === 'network' ? BLUE : GREEN;
                      const rx = node.type === 'network' ? 8 : node.type === 'firewall' ? 4 : 20;
                      const w = node.type === 'network' ? 100 : node.type === 'firewall' ? 60 : 70;
                      const h = node.type === 'network' ? 30 : node.type === 'firewall' ? 18 : 24;
                      return (
                        <g
                          key={node.id}
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                          className="cursor-pointer"
                        >
                          <rect
                            x={node.x - w / 2} y={node.y - h / 2}
                            width={w} height={h} rx={rx}
                            fill={isHovered ? `${nodeColor}22` : 'rgba(10,22,40,0.9)'}
                            stroke={nodeColor}
                            strokeWidth={isHovered ? 2 : 1}
                          />
                          {node.vuln && (
                            <motion.circle
                              cx={node.x + w / 2 - 4} cy={node.y - h / 2 + 4} r={4}
                              fill={RED}
                              animate={{ opacity: [1, 0.4, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                            />
                          )}
                          <text
                            x={node.x} y={node.y + 4}
                            textAnchor="middle"
                            fill={nodeColor}
                            fontSize={node.type === 'network' ? 10 : 9}
                            fontFamily="monospace"
                            fontWeight={isHovered ? 'bold' : 'normal'}
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                    {/* Hover Tooltip */}
                    {hoveredNode && (() => {
                      const node = topoNodes.find(n => n.id === hoveredNode);
                      if (!node) return null;
                      return (
                        <g>
                          <rect x={node.x + 45} y={node.y - 20} width={160} height={40} rx={4} fill="#0d1f38" stroke={DIM} />
                          <text x={node.x + 55} y={node.y - 4} fill="#889" fontSize={9} fontFamily="monospace">ZONE: {node.zone.toUpperCase()}</text>
                          <text x={node.x + 55} y={node.y + 10} fill={node.vuln ? RED : GREEN} fontSize={9} fontFamily="monospace">
                            STATUS: {node.vuln ? '⚠ VULNERABLE' : '✓ SECURE'}
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* C. PROTOCOL ANALYSIS */}
                <div className="rounded-lg p-4" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Radio className="w-4 h-4" style={{ color: GREEN }} />
                    <span className="text-xs font-mono tracking-wider" style={{ color: GREEN }}>PROTOCOL ANALYSIS</span>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {results.protocolAnalysis.map(p => (
                      <div key={p.protocol}>
                        <button
                          onClick={() => setExpandedProtocol(expandedProtocol === p.protocol ? null : p.protocol)}
                          className="w-full text-left rounded p-3 flex items-center gap-3 transition-all"
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            border: `1px solid ${p.risk === 'critical' ? 'rgba(255,51,51,0.3)' : p.risk === 'high' ? 'rgba(255,170,0,0.2)' : 'rgba(0,170,255,0.2)'}`,
                          }}
                        >
                          {expandedProtocol === p.protocol
                            ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#556' }} />
                            : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#556' }} />}
                          <span className="text-sm font-mono flex-1" style={{ color: p.risk === 'critical' ? RED : p.risk === 'high' ? AMBER : BLUE }}>
                            {p.protocol}
                          </span>
                          <span className="text-xs font-mono" style={{ color: '#556' }}>{p.port || 'N/A'}</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded font-mono"
                            style={{
                              background: p.risk === 'critical' ? 'rgba(255,51,51,0.2)' : p.risk === 'high' ? 'rgba(255,170,0,0.15)' : 'rgba(0,170,255,0.15)',
                              color: p.risk === 'critical' ? RED : p.risk === 'high' ? AMBER : BLUE,
                            }}
                          >
                            {p.risk.toUpperCase()}
                          </span>
                        </button>
                        <AnimatePresence>
                          {expandedProtocol === p.protocol && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-6 p-3 space-y-2 rounded mt-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                <div>
                                  <span className="text-xs" style={{ color: '#556' }}>VULNERABILITIES</span>
                                  {p.vulnerabilities.map((v, i) => (
                                    <div key={i} className="flex items-center gap-2 mt-1">
                                      <Bug className="w-3 h-3" style={{ color: RED }} />
                                      <span className="text-xs" style={{ color: '#99a' }}>{v}</span>
                                    </div>
                                  ))}
                                </div>
                                {p.complianceGaps.length > 0 && (
                                  <div>
                                    <span className="text-xs" style={{ color: '#556' }}>COMPLIANCE GAPS</span>
                                    {p.complianceGaps.map((g, i) => (
                                      <div key={i} className="flex items-center gap-2 mt-1">
                                        <AlertTriangle className="w-3 h-3" style={{ color: AMBER }} />
                                        <span className="text-xs" style={{ color: '#99a' }}>{g}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div>
                                  <span className="text-xs" style={{ color: '#556' }}>RECOMMENDATIONS</span>
                                  {p.recommendations.map((r, i) => (
                                    <div key={i} className="flex items-center gap-2 mt-1">
                                      <ArrowRight className="w-3 h-3" style={{ color: GREEN }} />
                                      <span className="text-xs" style={{ color: GREEN }}>{r}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                {/* D. APT THREAT ASSESSMENT */}
                <div className="xl:col-span-2 rounded-lg p-4" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4" style={{ color: RED }} />
                    <span className="text-xs font-mono tracking-wider" style={{ color: RED }}>APT THREAT ASSESSMENT</span>
                    <span className="text-xs ml-auto" style={{ color: '#556' }}>
                      Risk Score: <span style={{ color: results.aptAssessment.riskScore > 50 ? RED : AMBER }}>{results.aptAssessment.riskScore}/100</span>
                    </span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: '#778' }}>{results.aptAssessment.targeting}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.aptAssessment.activeThreats.map(apt => (
                      <div
                        key={apt.id}
                        className="rounded p-3"
                        style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${apt.severity === 'critical' ? 'rgba(255,51,51,0.2)' : 'rgba(255,170,0,0.15)'}` }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Skull className="w-4 h-4" style={{ color: apt.severity === 'critical' ? RED : AMBER }} />
                          <span className="font-mono text-sm font-bold" style={{ color: apt.severity === 'critical' ? RED : AMBER }}>{apt.id}</span>
                          <span className="text-xs" style={{ color: '#778' }}>{apt.name}</span>
                          <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{
                            background: apt.severity === 'critical' ? 'rgba(255,51,51,0.15)' : 'rgba(255,170,0,0.1)',
                            color: apt.severity === 'critical' ? RED : AMBER,
                          }}>{apt.severity.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-3 h-3" style={{ color: '#556' }} />
                          <span className="text-xs" style={{ color: '#99a' }}>Origin: {apt.origin}</span>
                          <span className="text-xs" style={{ color: '#556' }}>|</span>
                          <span className="text-xs" style={{ color: '#99a' }}>Targets: {apt.targets.join(', ')}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {apt.techniques.map(t => (
                            <span key={t} className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'rgba(0,170,255,0.1)', color: BLUE, border: `1px solid rgba(0,170,255,0.2)` }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {results.aptAssessment.activeThreats.length === 0 && (
                    <div className="text-center py-6">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2" style={{ color: GREEN }} />
                      <p className="text-sm" style={{ color: GREEN }}>No APT groups specifically targeting this sector-protocol combination</p>
                    </div>
                  )}
                </div>

                {/* MITRE ATT&CK Mapping */}
                <div className="xl:col-span-2 rounded-lg p-4" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Crosshair className="w-4 h-4" style={{ color: BLUE }} />
                    <span className="text-xs font-mono tracking-wider" style={{ color: BLUE }}>MITRE ATT&CK FOR ICS MAPPING</span>
                    <span className="ml-auto text-xs" style={{ color: '#556' }}>
                      Coverage: {results.mitreAttackMapping.coverageScore}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[250px] overflow-y-auto">
                    {results.mitreAttackMapping.techniques.map(t => (
                      <div
                        key={t.id}
                        className="rounded p-2 flex items-center gap-2"
                        style={{
                          background: t.detected ? 'rgba(255,51,51,0.08)' : 'rgba(0,0,0,0.2)',
                          border: `1px solid ${t.detected ? 'rgba(255,51,51,0.25)' : DIM}`,
                        }}
                      >
                        {t.detected
                          ? <Eye className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
                          : <Eye className="w-3.5 h-3.5 shrink-0" style={{ color: '#334' }} />}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono" style={{ color: t.detected ? RED : '#556' }}>{t.id}</div>
                          <div className="text-xs truncate" style={{ color: '#778' }}>{t.name}</div>
                          <div className="text-xs" style={{ color: '#445' }}>{t.tactic}</div>
                        </div>
                        {t.detected && (
                          <span className="text-xs font-mono" style={{ color: RED }}>{t.confidence}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Network Segmentation Issues */}
                {results.networkSegmentation.issues.length > 0 && (
                  <div className="xl:col-span-2 rounded-lg p-4" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4" style={{ color: AMBER }} />
                      <span className="text-xs font-mono tracking-wider" style={{ color: AMBER }}>NETWORK SEGMENTATION — {results.networkSegmentation.score}%</span>
                    </div>
                    <div className="space-y-2">
                      {results.networkSegmentation.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 rounded p-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: issue.includes('CRITICAL') ? RED : AMBER }} />
                          <span className="text-xs" style={{ color: issue.includes('CRITICAL') ? RED : '#99a' }}>{issue}</span>
                        </div>
                      ))}
                      {results.networkSegmentation.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 ml-4">
                          <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" style={{ color: GREEN }} />
                          <span className="text-xs" style={{ color: GREEN }}>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ COMPLIANCE TAB ═══ */}
            {activeTab === 'compliance' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* NERC CIP */}
                <div className="rounded-lg p-4" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4" style={results.nercCompliance.score > 0 ? { color: results.nercCompliance.score >= 80 ? GREEN : AMBER } : { color: '#334' }} />
                    <span className="text-xs font-mono tracking-wider" style={{ color: '#889' }}>NERC CIP COMPLIANCE</span>
                    {results.nercCompliance.score > 0 && (
                      <span className="ml-auto text-lg font-bold font-mono" style={{ color: results.nercCompliance.score >= 80 ? GREEN : results.nercCompliance.score >= 50 ? AMBER : RED }}>
                        {results.nercCompliance.score}%
                      </span>
                    )}
                  </div>
                  {results.nercCompliance.requirements.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: '#445' }}>NERC CIP compliance only assessed for Energy sector</p>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {results.nercCompliance.requirements.map(req => (
                        <div key={req.code} className="rounded p-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                          <div className="flex items-center gap-2">
                            {req.status === 'pass'
                              ? <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />
                              : req.status === 'partial'
                              ? <Clock className="w-4 h-4" style={{ color: AMBER }} />
                              : <XCircle className="w-4 h-4" style={{ color: RED }} />}
                            <span className="text-sm font-mono" style={{ color: '#aab' }}>{req.code}</span>
                            <span className="text-xs flex-1 truncate" style={{ color: '#667' }}>{req.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                background: req.status === 'pass' ? 'rgba(0,255,65,0.1)' : req.status === 'partial' ? 'rgba(255,170,0,0.1)' : 'rgba(255,51,51,0.1)',
                                color: req.status === 'pass' ? GREEN : req.status === 'partial' ? AMBER : RED,
                              }}
                            >
                              {req.status.toUpperCase()}
                            </span>
                          </div>
                          {req.gaps.length > 0 && (
                            <div className="mt-2 ml-6 space-y-1">
                              {req.gaps.map((g, i) => (
                                <div key={i} className="text-xs" style={{ color: '#778' }}>• {g}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* IEC 62443 */}
                <div className="rounded-lg p-4" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4" style={{ color: results.iec62443Compliance.score >= 80 ? GREEN : results.iec62443Compliance.score >= 50 ? AMBER : RED }} />
                    <span className="text-xs font-mono tracking-wider" style={{ color: '#889' }}>IEC 62443 COMPLIANCE</span>
                    <span className="ml-auto text-lg font-bold font-mono" style={{ color: results.iec62443Compliance.score >= 80 ? GREEN : results.iec62443Compliance.score >= 50 ? AMBER : RED }}>
                      {results.iec62443Compliance.score}%
                    </span>
                  </div>
                  <div className="space-y-3">
                    {results.iec62443Compliance.zones.map(zone => (
                      <div key={zone.zone} className="rounded p-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-mono font-bold" style={{ color: zone.score >= 80 ? GREEN : zone.score >= 50 ? AMBER : RED }}>
                            {zone.zone}
                          </span>
                          <span className="text-xs" style={{ color: '#556' }}>— Score: {zone.score}%</span>
                          {/* Score bar */}
                          <div className="flex-1 mx-2 h-1.5 rounded-full" style={{ background: DIM }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${zone.score}%`,
                                background: zone.score >= 80 ? GREEN : zone.score >= 50 ? AMBER : RED,
                              }}
                            />
                          </div>
                        </div>
                        {zone.gaps.length > 0 && (
                          <div className="ml-4 space-y-1 mb-2">
                            {zone.gaps.map((g, i) => (
                              <div key={i} className="text-xs flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: AMBER }} />
                                <span style={{ color: '#99a' }}>{g}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {zone.recommendations.length > 0 && (
                          <div className="ml-4 space-y-1">
                            {zone.recommendations.map((r, i) => (
                              <div key={i} className="text-xs flex items-start gap-1">
                                <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" style={{ color: GREEN }} />
                                <span style={{ color: 'rgba(0,255,65,0.7)' }}>{r}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ FIRMWARE TAB ═══ */}
            {activeTab === 'firmware' && (
              <div className="rounded-lg p-4" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="w-4 h-4" style={{ color: GREEN }} />
                  <span className="text-xs font-mono tracking-wider" style={{ color: GREEN }}>FIRMWARE ANALYSIS</span>
                </div>
                {results.firmwareAnalysis.devices.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="w-8 h-8 mx-auto mb-2" style={{ color: '#334' }} />
                    <p className="text-sm" style={{ color: '#556' }}>No device data provided for firmware analysis</p>
                    <p className="text-xs mt-1" style={{ color: '#334' }}>Include device inventory in analysis request for CVE tracking</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.firmwareAnalysis.devices.map((dev, i) => (
                      <div
                        key={i}
                        className="rounded p-3"
                        style={{
                          background: 'rgba(0,0,0,0.2)',
                          border: `1px solid ${dev.riskLevel === 'critical' ? 'rgba(255,51,51,0.3)' : dev.riskLevel === 'high' ? 'rgba(255,170,0,0.2)' : DIM}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {dev.riskLevel === 'critical' ? <Skull className="w-4 h-4" style={{ color: RED }} /> : dev.riskLevel === 'high' ? <AlertTriangle className="w-4 h-4" style={{ color: AMBER }} /> : <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />}
                          <span className="text-sm font-mono" style={{ color: '#aab' }}>{dev.device}</span>
                          <span className="text-xs" style={{ color: '#556' }}>FW: {dev.firmware || 'Unknown'}</span>
                          <span className="ml-auto">
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                background: dev.riskLevel === 'critical' ? 'rgba(255,51,51,0.15)' : dev.riskLevel === 'high' ? 'rgba(255,170,0,0.1)' : 'rgba(0,255,65,0.1)',
                                color: dev.riskLevel === 'critical' ? RED : dev.riskLevel === 'high' ? AMBER : GREEN,
                              }}
                            >
                              {dev.riskLevel.toUpperCase()}
                            </span>
                          </span>
                        </div>
                        {dev.knownCVEs.length > 0 && (
                          <div className="ml-6 mb-2 space-y-1">
                            {dev.knownCVEs.map((cve, j) => (
                              <div key={j} className="flex items-center gap-2">
                                <Bug className="w-3 h-3" style={{ color: cve.severity === 'critical' ? RED : AMBER }} />
                                <span className="text-xs font-mono" style={{ color: cve.severity === 'critical' ? RED : AMBER }}>{cve.cve}</span>
                                <span className="text-xs" style={{ color: '#778' }}>{cve.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="ml-6 flex items-start gap-1">
                          <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" style={{ color: GREEN }} />
                          <span className="text-xs" style={{ color: GREEN }}>{dev.recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ REPORTS TAB ═══ */}
            {activeTab === 'reports' && (
              <div className="rounded-lg p-6 text-center" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
                <FileText className="w-10 h-10 mx-auto mb-4" style={{ color: GREEN }} />
                <h3 className="text-lg font-mono mb-2" style={{ color: '#aab' }}>THREAT INTELLIGENCE REPORTS</h3>
                <p className="text-xs mb-6" style={{ color: '#556' }}>Generate and download structured threat intelligence reports for sharing and compliance</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => downloadReport('stix')}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all"
                    style={{
                      background: 'rgba(0,255,65,0.1)',
                      border: `1px solid ${GREEN}`,
                      color: GREEN,
                    }}
                  >
                    <Download className="w-4 h-4" />STIX 2.1 REPORT (JSON)
                  </button>
                  <button
                    onClick={() => downloadReport('iodef')}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all"
                    style={{
                      background: 'rgba(0,170,255,0.1)',
                      border: `1px solid ${BLUE}`,
                      color: BLUE,
                    }}
                  >
                    <Download className="w-4 h-4" />IODEF REPORT (XML)
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-left">
                  <div className="rounded p-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="text-xs font-mono mb-2" style={{ color: GREEN }}>STIX 2.1 FORMAT</div>
                    <p className="text-xs" style={{ color: '#667' }}>Structured Threat Information Expression — industry standard for sharing cyber threat intelligence. Includes indicators, relationships, and observed TTPs.</p>
                  </div>
                  <div className="rounded p-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="text-xs font-mono mb-2" style={{ color: BLUE }}>IODEF FORMAT</div>
                    <p className="text-xs" style={{ color: '#667' }}>Incident Object Description Exchange Format — RFC 5070 compliant XML format for incident reporting and Computer Security Incident Response Team (CSIRT) coordination.</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── EMPTY STATE ── */}
      {!results && !loading && (
        <div className="rounded-lg p-12 text-center" style={{ background: 'rgba(10,22,40,0.8)', border: `1px solid ${DIM}` }}>
          <Radar className="w-16 h-16 mx-auto mb-4" style={{ color: '#1a2a44' }} />
          <p className="text-sm font-mono" style={{ color: '#334' }}>SELECT PROTOCOLS AND RUN ANALYSIS</p>
          <p className="text-xs mt-1" style={{ color: '#223' }}>CNI Threat Sentinel will assess your OT/ICS infrastructure</p>
        </div>
      )}
    </div>
  );
}