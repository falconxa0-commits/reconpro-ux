'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImageIcon, Download, Copy, Share2, ExternalLink, Play, Camera,
  Film, Grid, Filter, Terminal, Shield, AlertTriangle, Zap, X,
  ChevronRight, Layers, BarChart3, Globe, Calendar, Loader2,
  CheckCircle, Twitter, Linkedin, Maximize2, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface FindingData {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  evidence: string | null;
  asset: string;
  cve: string | null;
  cvss: number | null;
  createdAt: string;
}

interface ScanData {
  id: string;
  target: { domain: string } | null;
  status: string;
  riskScore: number;
  totalVulns: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  startedAt: string;
  completedAt: string | null;
  findings: FindingData[];
}

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium';
type ResolutionKey = 'twitter' | 'linkedin' | 'fullhd';

interface ResolutionOption {
  key: ResolutionKey;
  label: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40', hex: '#ff3355' },
  high:     { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40', hex: '#ff8844' },
  medium:   { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40', hex: '#ffaa00' },
  low:      { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40', hex: '#3b82f6' },
  info:     { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/40', hex: '#6b7280' },
};

const RESOLUTIONS: ResolutionOption[] = [
  { key: 'twitter', label: 'Twitter/X', width: 280, height: 150, icon: <Twitter className="w-3.5 h-3.5" /> },
  { key: 'linkedin', label: 'LinkedIn', width: 1200, height: 627, icon: <Linkedin className="w-3.5 h-3.5" /> },
  { key: 'fullhd', label: 'Full HD', width: 1920, height: 1080, icon: <Maximize2 className="w-3.5 h-3.5" /> },
];

const CATEGORY_ICONS: Record<string, string> = {
  subdomain: '🌐', port: '🔌', technology: '⚙️', ssl: '🔒',
  dns: '📡', header: '📋', vulnerability: '🔴',
};

// ═══════════════════════════════════════════════════════════════════════
// Canvas Rendering — Core Proof Frame
// ═══════════════════════════════════════════════════════════════════════

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawGridOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.03)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= w; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();
}

function drawShieldIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.8, cy - size * 0.5);
  ctx.lineTo(cx + size * 0.8, cy + size * 0.2);
  ctx.quadraticCurveTo(cx + size * 0.6, cy + size, cx, cy + size);
  ctx.quadraticCurveTo(cx - size * 0.6, cy + size, cx - size * 0.8, cy + size * 0.2);
  ctx.lineTo(cx - size * 0.8, cy - size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

interface RenderProofOptions {
  resolution: ResolutionKey;
  animationFrame?: number;
  maxFrames?: number;
}

/**
 * Renders a single proof-of-exploit frame onto a canvas.
 * Returns { frameCount } so callers can orchestrate animation.
 */
function renderProof(
  canvas: HTMLCanvasElement,
  finding: FindingData,
  domain: string,
  options: RenderProofOptions,
) {
  const res = RESOLUTIONS.find(r => r.key === options.resolution) || RESOLUTIONS[2];
  const w = res.width;
  const h = res.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scale = Math.min(w / 1200, h / 1080, 1);
  const fontSize = (f: number) => Math.round(f * scale);
  const pad = fontSize(20);

  // ── Background ──
  ctx.fillStyle = '#0a0e17';
  ctx.fillRect(0, 0, w, h);
  drawGridOverlay(ctx, w, h);

  // ── Severity header bar ──
  const sevColor = SEVERITY_COLORS[finding.severity]?.hex || '#6b7280';
  const headerH = fontSize(48);
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, sevColor);
  grad.addColorStop(1, 'rgba(10, 14, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, headerH);

  // ── Top-left: ReconPro branding ──
  drawShieldIcon(ctx, pad + fontSize(10), pad + fontSize(8), fontSize(12), '#00ff88');
  ctx.font = `bold ${fontSize(18)}px monospace`;
  ctx.fillStyle = '#00ff88';
  ctx.textBaseline = 'middle';
  ctx.fillText('ReconPro', pad + fontSize(30), pad + fontSize(10));

  // ── Top-right: severity badge ──
  const sevLabel = finding.severity.toUpperCase();
  ctx.font = `bold ${fontSize(12)}px monospace`;
  const sevW = ctx.measureText(sevLabel).width + fontSize(24);
  const sevX = w - pad - sevW;
  drawRoundedRect(ctx, sevX, pad + fontSize(1), sevW, fontSize(20), 4);
  ctx.fillStyle = sevColor + '33';
  ctx.fill();
  ctx.strokeStyle = sevColor + '88';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = sevColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sevLabel, sevX + sevW / 2, pad + fontSize(11));
  ctx.textAlign = 'left';

  // ── Terminal section ──
  const termX = pad;
  const termY = headerH + pad;
  const termW = w - pad * 2;
  const termH = h - headerH - pad * 2 - fontSize(60);

  drawRoundedRect(ctx, termX, termY, termW, termH, 8);
  ctx.fillStyle = '#060a12';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Terminal title bar
  const titleH = fontSize(28);
  drawRoundedRect(ctx, termX, termY, termW, titleH, 8);
  ctx.save();
  ctx.clip();
  ctx.fillRect(termX, termY + titleH - 1, termW, 1);
  ctx.restore();
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(termX, termY + fontSize(2), termW, titleH - fontSize(2));

  // Terminal dots
  const dotR = fontSize(4);
  const dotY = termY + titleH / 2;
  ctx.fillStyle = '#ff3355'; ctx.beginPath(); ctx.arc(termX + pad, dotY, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(termX + pad + dotR * 3, dotY, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#00ff88'; ctx.beginPath(); ctx.arc(termX + pad + dotR * 6, dotY, dotR, 0, Math.PI * 2); ctx.fill();

  ctx.font = `${fontSize(11)}px monospace`;
  ctx.fillStyle = '#4b5563';
  ctx.textBaseline = 'middle';
  ctx.fillText(`reconpro — ${domain}`, termX + pad + dotR * 10, dotY);

  // ── Terminal text lines ──
  const lineH = fontSize(18);
  let lineY = termY + titleH + pad;
  const maxLines = Math.floor((termH - titleH - pad * 2) / lineH);
  const monoFont = `${fontSize(13)}px monospace`;
  ctx.font = monoFont;
  ctx.textBaseline = 'top';

  const lines: { text: string; color: string }[] = [];
  lines.push({ text: `$ reconpro scan --target ${domain} --mode full`, color: '#00ff88' });
  lines.push({ text: '[*] Initializing recon engine...', color: '#6b7280' });
  lines.push({ text: '[*] Enumerating subdomains, ports, technologies...', color: '#6b7280' });
  lines.push({ text: `[*] Scanning ${finding.category}: ${finding.asset}`, color: '#6b7280' });
  lines.push({ text: '', color: '#6b7280' });
  lines.push({ text: '[■■■■■■■■■■■■■■■■■■■■■■■■■■■] 100%', color: '#3b82f6' });
  lines.push({ text: '', color: '#6b7280' });
  lines.push({ text: `  ╔══════════════════════════════════════╗`, color: sevColor });
  lines.push({ text: `  ║  ⚠  ${finding.severity.toUpperCase()} FINDING DISCOVERED       ║`, color: sevColor });
  lines.push({ text: `  ╚══════════════════════════════════════╝`, color: sevColor });
  lines.push({ text: '', color: '#6b7280' });
  lines.push({ text: `  Severity:  ${finding.severity.toUpperCase()}`, color: sevColor });
  lines.push({ text: `  Category:  ${finding.category.toUpperCase()}`, color: '#60a5fa' });
  lines.push({ text: `  Asset:     ${finding.asset}`, color: '#d1d5db' });
  if (finding.cve) {
    lines.push({ text: `  CVE:       ${finding.cve}`, color: '#ffaa00' });
  }
  if (finding.cvss) {
    lines.push({ text: `  CVSS:      ${finding.cvss.toFixed(1)}`, color: '#ffaa00' });
  }
  lines.push({ text: '', color: '#6b7280' });
  lines.push({ text: `  ${finding.title}`, color: '#e5e7eb' });
  lines.push({ text: `  ${finding.description.substring(0, 80)}${finding.description.length > 80 ? '...' : ''}`, color: '#9ca3af' });
  if (finding.evidence) {
    lines.push({ text: '', color: '#6b7280' });
    lines.push({ text: `  > ${finding.evidence.substring(0, 70)}`, color: '#4b5563' });
  }

  const visibleLines = lines.slice(0, maxLines);
  for (const line of visibleLines) {
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, termX + pad, lineY);
    lineY += lineH;
  }

  // ── Bottom bar: finding title, domain, date, score ──
  const bottomY = termY + termH + pad;
  const bottomH = fontSize(46);
  drawRoundedRect(ctx, pad, bottomY, termW, bottomH, 8);
  ctx.fillStyle = 'rgba(15, 20, 30, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const bottomPad = pad;
  ctx.font = `bold ${fontSize(14)}px monospace`;
  ctx.fillStyle = '#e5e7eb';
  ctx.textBaseline = 'middle';
  ctx.fillText(finding.title, pad + bottomPad, bottomY + bottomH / 2 - fontSize(8), termW - bottomPad * 3);

  ctx.font = `${fontSize(11)}px monospace`;
  ctx.fillStyle = '#6b7280';
  const dateStr = new Date(finding.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  ctx.fillText(`${domain}  •  ${dateStr}${finding.cvss ? `  •  CVSS ${finding.cvss.toFixed(1)}` : ''}`, pad + bottomPad, bottomY + bottomH / 2 + fontSize(10));

  // Score badge
  if (finding.cvss) {
    const scoreText = `${finding.cvss.toFixed(1)}`;
    ctx.font = `bold ${fontSize(16)}px monospace`;
    const scoreW = ctx.measureText(scoreText).width + fontSize(20);
    const scoreX = w - pad - scoreW;
    drawRoundedRect(ctx, scoreX, bottomY + (bottomH - fontSize(28)) / 2, scoreW, fontSize(28), 6);
    ctx.fillStyle = sevColor + '33';
    ctx.fill();
    ctx.strokeStyle = sevColor + '88';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = sevColor;
    ctx.textAlign = 'center';
    ctx.fillText(scoreText, scoreX + scoreW / 2, bottomY + bottomH / 2);
    ctx.textAlign = 'left';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Canvas Typewriter Animation Engine
// ═══════════════════════════════════════════════════════════════════════

interface AnimationState {
  phase: 'idle' | 'typing' | 'progress' | 'discovery' | 'exploit' | 'overlay' | 'done';
  charIndex: number;
  lineIndex: number;
  progressValue: number;
  discoveryAlpha: number;
  overlayAlpha: number;
  frameCount: number;
  rafId: number | null;
}

function createAnimState(): AnimationState {
  return {
    phase: 'idle', charIndex: 0, lineIndex: 0, progressValue: 0,
    discoveryAlpha: 0, overlayAlpha: 0, frameCount: 0, rafId: null,
  };
}

function getTerminalLines(finding: FindingData, domain: string) {
  const sevColor = SEVERITY_COLORS[finding.severity]?.hex || '#6b7280';
  const lines: { text: string; color: string; isProgress?: boolean; isDiscovery?: boolean }[] = [];
  lines.push({ text: `$ reconpro scan --target ${domain} --mode full`, color: '#00ff88' });
  lines.push({ text: '[*] Initializing recon engine...', color: '#6b7280' });
  lines.push({ text: '[*] Enumerating subdomains, ports, technologies...', color: '#6b7280' });
  lines.push({ text: `[*] Scanning ${finding.category}: ${finding.asset}`, color: '#6b7280' });
  lines.push({ text: '', color: '#6b7280' });
  lines.push({ text: '[■■■■■■■■■■■■■■■■■■■■■■■■■■■] 100%', color: '#3b82f6', isProgress: true });
  lines.push({ text: '', color: '#6b7280' });
  lines.push({ text: `  ╔══════════════════════════════════════╗`, color: sevColor, isDiscovery: true });
  lines.push({ text: `  ║  ⚠  ${finding.severity.toUpperCase()} FINDING DISCOVERED       ║`, color: sevColor, isDiscovery: true });
  lines.push({ text: `  ╚══════════════════════════════════════╝`, color: sevColor, isDiscovery: true });
  lines.push({ text: '', color: '#6b7280' });
  lines.push({ text: `  Severity:  ${finding.severity.toUpperCase()}`, color: sevColor });
  lines.push({ text: `  Category:  ${finding.category.toUpperCase()}`, color: '#60a5fa' });
  lines.push({ text: `  Asset:     ${finding.asset}`, color: '#d1d5db' });
  if (finding.cve) {
    lines.push({ text: `  CVE:       ${finding.cve}`, color: '#ffaa00' });
  }
  if (finding.cvss) {
    lines.push({ text: `  CVSS:      ${finding.cvss.toFixed(1)}`, color: '#ffaa00' });
  }
  lines.push({ text: '', color: '#6b7280' });
  lines.push({ text: `  ${finding.title}`, color: '#e5e7eb' });
  lines.push({ text: `  ${finding.description.substring(0, 80)}${finding.description.length > 80 ? '...' : ''}`, color: '#9ca3af' });
  if (finding.evidence) {
    lines.push({ text: '', color: '#6b7280' });
    lines.push({ text: `  > ${finding.evidence.substring(0, 70)}`, color: '#4b5563' });
  }
  return lines;
}

function drawAnimFrame(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: AnimationState,
  lines: ReturnType<typeof getTerminalLines>,
  finding: FindingData,
  domain: string,
) {
  const scale = Math.min(w / 1200, h / 1080, 1);
  const fs = (f: number) => Math.round(f * scale);
  const pad = fs(20);
  const sevColor = SEVERITY_COLORS[finding.severity]?.hex || '#6b7280';

  // Background
  ctx.fillStyle = '#0a0e17';
  ctx.fillRect(0, 0, w, h);
  drawGridOverlay(ctx, w, h);

  // Severity header bar (always visible)
  const headerH = fs(48);
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, sevColor);
  grad.addColorStop(1, 'rgba(10, 14, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, headerH);

  // Top-left branding
  drawShieldIcon(ctx, pad + fs(10), pad + fs(8), fs(12), '#00ff88');
  ctx.font = `bold ${fs(18)}px monospace`;
  ctx.fillStyle = '#00ff88';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('ReconPro', pad + fs(30), pad + fs(10));

  // Top-right severity badge
  const sevLabel = finding.severity.toUpperCase();
  ctx.font = `bold ${fs(12)}px monospace`;
  const sevW = ctx.measureText(sevLabel).width + fs(24);
  const sevX = w - pad - sevW;
  drawRoundedRect(ctx, sevX, pad + fs(1), sevW, fs(20), 4);
  ctx.fillStyle = sevColor + '33'; ctx.fill();
  ctx.strokeStyle = sevColor + '88'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = sevColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sevLabel, sevX + sevW / 2, pad + fs(11));
  ctx.textAlign = 'left';

  // Terminal box
  const termX = pad;
  const termY = headerH + pad;
  const termW = w - pad * 2;
  const termH = h - headerH - pad * 2 - fs(60);

  drawRoundedRect(ctx, termX, termY, termW, termH, 8);
  ctx.fillStyle = '#060a12'; ctx.fill();
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)'; ctx.lineWidth = 1; ctx.stroke();

  // Terminal title bar
  const titleH = fs(28);
  ctx.save();
  drawRoundedRect(ctx, termX, termY, termW, titleH, 8);
  ctx.clip();
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(termX, termY, termW, titleH);
  ctx.restore();

  const dotR = fs(4);
  const dotY = termY + titleH / 2;
  ctx.fillStyle = '#ff3355'; ctx.beginPath(); ctx.arc(termX + pad, dotY, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(termX + pad + dotR * 3, dotY, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#00ff88'; ctx.beginPath(); ctx.arc(termX + pad + dotR * 6, dotY, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.font = `${fs(11)}px monospace`; ctx.fillStyle = '#4b5563';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(`reconpro — ${domain}`, termX + pad + dotR * 10, dotY);

  // Red flash on discovery
  if (state.discoveryAlpha > 0) {
    ctx.fillStyle = `rgba(239, 68, 68, ${state.discoveryAlpha * 0.15})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Terminal lines (typewriter)
  const lineH = fs(18);
  let lineY = termY + titleH + pad;
  const maxLines = Math.floor((termH - titleH - pad * 2) / lineH);
  ctx.font = `${fs(13)}px monospace`;
  ctx.textBaseline = 'top';

  for (let i = 0; i < Math.min(state.lineIndex + 1, lines.length, maxLines); i++) {
    const line = lines[i];
    let text = line.text;
    if (i === state.lineIndex && state.phase === 'typing') {
      text = text.substring(0, state.charIndex);
    }
    ctx.fillStyle = line.color;
    ctx.fillText(text, termX + pad, lineY);

    // Blinking cursor on active line
    if (i === state.lineIndex && state.phase === 'typing') {
      if (Math.floor(state.frameCount / 15) % 2 === 0) {
        const textW = ctx.measureText(text).width;
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(termX + pad + textW, lineY, fs(8), fs(14));
      }
    }
    lineY += lineH;
  }

  // Bottom bar (fades in with overlay phase)
  if (state.overlayAlpha > 0) {
    const bottomY = termY + termH + pad;
    const bottomH = fs(46);
    drawRoundedRect(ctx, pad, bottomY, termW, bottomH, 8);
    ctx.fillStyle = `rgba(15, 20, 30, ${0.9 * state.overlayAlpha})`; ctx.fill();
    ctx.strokeStyle = `rgba(0, 255, 136, ${0.1 * state.overlayAlpha})`; ctx.lineWidth = 1; ctx.stroke();

    ctx.globalAlpha = state.overlayAlpha;
    ctx.font = `bold ${fs(14)}px monospace`; ctx.fillStyle = '#e5e7eb';
    ctx.textBaseline = 'middle';
    ctx.fillText(finding.title, pad + fs(20), bottomY + bottomH / 2 - fs(8), termW - fs(80));

    ctx.font = `${fs(11)}px monospace`; ctx.fillStyle = '#6b7280';
    const dateStr = new Date(finding.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
    ctx.fillText(`${domain}  •  ${dateStr}${finding.cvss ? `  •  CVSS ${finding.cvss.toFixed(1)}` : ''}`, pad + fs(20), bottomY + bottomH / 2 + fs(10));

    if (finding.cvss) {
      const scoreText = `${finding.cvss.toFixed(1)}`;
      ctx.font = `bold ${fs(16)}px monospace`;
      const scoreW = ctx.measureText(scoreText).width + fs(20);
      const scoreX = w - pad - scoreW;
      drawRoundedRect(ctx, scoreX, bottomY + (bottomH - fs(28)) / 2, scoreW, fs(28), 6);
      ctx.fillStyle = sevColor + '33'; ctx.fill();
      ctx.strokeStyle = sevColor + '88'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = sevColor;
      ctx.textAlign = 'center';
      ctx.fillText(scoreText, scoreX + scoreW / 2, bottomY + bottomH / 2);
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Animation Hook
// ═══════════════════════════════════════════════════════════════════════

function useProofAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  finding: FindingData | null,
  domain: string,
  resolution: ResolutionKey,
  isPlaying: boolean,
) {
  const stateRef = useRef<AnimationState>(createAnimState());
  const linesRef = useRef<ReturnType<typeof getTerminalLines>>([]);

  const cleanup = useCallback(() => {
    if (stateRef.current.rafId) {
      cancelAnimationFrame(stateRef.current.rafId);
      stateRef.current.rafId = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    stateRef.current = createAnimState();
    if (finding) {
      linesRef.current = getTerminalLines(finding, domain);
    }
  }, [cleanup, finding, domain]);

  useEffect(() => {
    if (!canvasRef.current || !finding || !isPlaying) return;
    reset();

    const res = RESOLUTIONS.find(r => r.key === resolution) || RESOLUTIONS[2];
    const canvas = canvasRef.current;
    canvas.width = res.width;
    canvas.height = res.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    linesRef.current = getTerminalLines(finding, domain);
    const lines = linesRef.current;
    const state = stateRef.current;
  

    const CHARS_PER_FRAME = 3;
    const FRAMES_BETWEEN_LINES = 2;
    const PROGRESS_SPEED = 2;
    const DISCOVERY_FRAMES = 30;
    const OVERLAY_SPEED = 0.03;

    let lineWait = 0;

    const animate = () => {
      state.frameCount++;

      switch (state.phase) {
        case 'typing': {
          if (lineWait > 0) {
            lineWait--;
            break;
          }
          const currentLine = lines[state.lineIndex];
          if (!currentLine) {
            state.phase = 'done';
            break;
          }
          if (currentLine.isDiscovery && state.lineIndex > 0 && lines[state.lineIndex - 1]?.text === '') {
            state.phase = 'discovery';
            state.discoveryAlpha = 1;
            state.charIndex = 0;
            break;
          }
          state.charIndex += CHARS_PER_FRAME;
          if (state.charIndex >= currentLine.text.length) {
            state.charIndex = 0;
            state.lineIndex++;
            lineWait = FRAMES_BETWEEN_LINES;
            if (state.lineIndex >= lines.length || state.lineIndex >= Math.floor((res.height * 0.6) / 18)) {
              state.phase = 'overlay';
            }
          }
          break;
        }
        case 'discovery': {
          state.discoveryAlpha -= 1 / DISCOVERY_FRAMES;
          if (state.discoveryAlpha <= 0) {
            state.discoveryAlpha = 0;
            state.charIndex = 0;
            state.phase = 'typing';
            lineWait = 0;
          }
          break;
        }
        case 'overlay': {
          state.overlayAlpha = Math.min(1, state.overlayAlpha + OVERLAY_SPEED);
          if (state.overlayAlpha >= 1) {
            state.phase = 'done';
          }
          break;
        }
        case 'done': {
          // Render final frame once more then stop
          drawAnimFrame(ctx, res.width, res.height, state, lines, finding, domain);
          return; // Stop animation
        }
      }

      drawAnimFrame(ctx, res.width, res.height, state, lines, finding, domain);
      state.rafId = requestAnimationFrame(animate);
    };

    state.rafId = requestAnimationFrame(animate);
    return cleanup;
  }, [canvasRef, finding, domain, resolution, isPlaying, reset, cleanup]);

  return { reset, renderStatic: () => {
    if (!canvasRef.current || !finding) return;
    const res = RESOLUTIONS.find(r => r.key === resolution) || RESOLUTIONS[2];
    renderProof(canvasRef.current, finding, domain, { resolution, animationFrame: 0 });
  } };
}

// ═══════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════

function SeverityBadge({ severity }: { severity: string }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.info;
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-bold uppercase border', c.bg, c.text, c.border)}>
      {severity}
    </span>
  );
}

function ProofCard({
  finding, domain, scanDate, onClick, index,
}: {
  finding: FindingData; domain: string; scanDate: string; onClick: () => void; index: number;
}) {
  const c = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.info;
  const thumbRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!thumbRef.current) return;
    renderProof(thumbRef.current, finding, domain, { resolution: 'twitter' });
  }, [finding, domain]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'relative group cursor-pointer rounded-lg border bg-gray-900/80 hover:bg-gray-800/80 transition-all duration-200',
        'hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5',
        c.border,
      )}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-200 line-clamp-2 leading-tight">
            {finding.title}
          </h3>
          <SeverityBadge severity={finding.severity} />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Globe className="w-3 h-3" />
          <span className="truncate">{domain}</span>
          <span className="text-gray-700">•</span>
          <Calendar className="w-3 h-3" />
          <span>{new Date(scanDate).toLocaleDateString()}</span>
        </div>
        <div className="rounded-md overflow-hidden bg-[#0a0e17] border border-gray-800/50">
          <canvas ref={thumbRef} className="w-full h-auto" style={{ imageRendering: 'auto' }} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>{CATEGORY_ICONS[finding.category] || '🔍'}</span>
            <span className="uppercase">{finding.category}</span>
            {finding.cvss && (
              <span className={cn('ml-2 font-mono', c.text)}>
                CVSS {finding.cvss.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-3 h-3" />
            <span>Generate</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Proof Generator Modal
// ═══════════════════════════════════════════════════════════════════════

function ProofGenerator({
  finding, domain, onClose,
}: {
  finding: FindingData; domain: string; onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resolution, setResolution] = useState<ResolutionKey>('linkedin');
  const [isPlaying, setIsPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(1);

  const { reset, renderStatic } = useProofAnimation(canvasRef, finding, domain, resolution, isPlaying);

  useEffect(() => {
    if (!isPlaying) {
      renderStatic();
    }
  }, [isPlaying, renderStatic]);

  const handleResolutionChange = (key: ResolutionKey) => {
    setResolution(key);
    setIsPlaying(false);
  };

  const handleReplay = () => {
    reset();
    setIsPlaying(true);
    setGeneratedCount(prev => prev + 1);
  };

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `reconpro-proof-${finding.severity}-${finding.id.substring(0, 8)}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleCopyToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob | null>(resolve =>
        canvasRef.current!.toBlob(resolve, 'image/png'),
      );
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: copy data URL
      try {
        await navigator.clipboard.writeText(canvasRef.current.toDataURL('image/png'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* noop */ }
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Just uncovered a ${finding.severity.toUpperCase()} ${finding.category} vulnerability using @ReconPro. Watch proof below.\n\n${finding.title}\n\n#BugBounty #InfoSec #CyberSecurity`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent(
      `I discovered a ${finding.severity.toUpperCase()}-severity ${finding.category} vulnerability using ReconPro automated security scanning.\n\nFinding: ${finding.title}\nTarget: ${domain}\n${finding.cvss ? `CVSS Score: ${finding.cvss.toFixed(1)}` : ''}\n\n#CyberSecurity #VulnerabilityAssessment #InfoSec`,
    );
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://reconpro.io')}&summary=${text}`, '_blank');
  };

  const c = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.info;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-gray-950 border border-gray-800 rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gray-950/95 backdrop-blur border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20">
              <Film className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Proof Generator</h2>
              <p className="text-xs text-gray-500">Generate animated proof-of-exploit for sharing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Finding info */}
          <div className="flex flex-wrap items-center gap-3">
            <SeverityBadge severity={finding.severity} />
            <span className="text-sm text-gray-300 font-medium">{finding.title}</span>
            <span className="text-xs text-gray-600">•</span>
            <span className="text-xs text-gray-500 flex items-center gap-1"><Globe className="w-3 h-3" />{domain}</span>
            {finding.cvss && <span className={cn('text-xs font-mono', c.text)}>CVSS {finding.cvss.toFixed(1)}</span>}
          </div>

          {/* Canvas */}
          <div className="rounded-lg overflow-hidden border border-gray-800 bg-[#0a0e17]">
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ imageRendering: 'auto', maxHeight: '60vh' }}
            />
          </div>

          {/* Resolution selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Resolution:</span>
            {RESOLUTIONS.map(r => (
              <button
                key={r.key}
                onClick={() => handleResolutionChange(r.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border',
                  resolution === r.key
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700',
                )}
              >
                {r.icon}
                <span>{r.label}</span>
                <span className="text-gray-600">({r.width}x{r.height})</span>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleReplay}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Replay Animation
            </button>
            <button
              onClick={handleDownloadPNG}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download as PNG
            </button>
            <button
              onClick={handleCopyToClipboard}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                copied
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700',
              )}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>

            <div className="w-px h-8 bg-gray-800 self-center mx-1" />

            <button
              onClick={handleShareTwitter}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <Twitter className="w-4 h-4" />
              Share on X
            </button>
            <button
              onClick={handleShareLinkedIn}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <Linkedin className="w-4 h-4" />
              Share on LinkedIn
            </button>
          </div>

          {/* Share CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5 border border-green-500/20"
          >
            <Share2 className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400 font-medium">Share this proof</span>
            <span className="text-xs text-gray-600">— Prove the vulnerability exists</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Generate All Modal
// ═══════════════════════════════════════════════════════════════════════

function GenerateAllModal({
  findings, domain, onClose,
}: {
  findings: FindingData[]; domain: string; onClose: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useProofAnimation(canvasRef, findings[current] || null, domain, 'linkedin', isPlaying);

  // Track when playback reaches the final finding
  const doneRef = useRef(false);
  useEffect(() => {
    const isAtEnd = current >= findings.length - 1;
    if (isAtEnd && !isPlaying && !doneRef.current) {
      doneRef.current = true;
      setDone(true);
    } else if (!isAtEnd || isPlaying) {
      doneRef.current = false;
    }
  }, [current, findings.length, isPlaying]);

  const handleNext = () => {
    if (current < findings.length - 1) {
      setCurrent(prev => prev + 1);
      setIsPlaying(true);
    } else {
      setDone(true);
    }
  };

  const handleDownloadCurrent = () => {
    if (!canvasRef.current) return;
    const f = findings[current];
    const link = document.createElement('a');
    link.download = `reconpro-proof-${f.severity}-${f.id.substring(0, 8)}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl bg-gray-950 border border-gray-800 rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">
              Generating Proofs ({current + 1}/{findings.length})
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-green-500 rounded-full"
                animate={{ width: `${((current + 1) / findings.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-gray-500 font-mono">{current + 1}/{findings.length}</span>
          </div>

          <div className="rounded-lg overflow-hidden border border-gray-800 bg-[#0a0e17]">
            <canvas ref={canvasRef} className="w-full h-auto" style={{ imageRendering: 'auto' }} />
          </div>

          <div className="flex items-center justify-between mt-4">
            {findings[current] && (
              <div className="flex items-center gap-2">
                <SeverityBadge severity={findings[current].severity} />
                <span className="text-sm text-gray-400">{findings[current].title}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDownloadCurrent}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm"
              >
                <Download className="w-4 h-4" /> Save This
              </button>
              {!done ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm font-medium"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" /> All Done
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Proof Stats Bar
// ═══════════════════════════════════════════════════════════════════════

function ProofStats({ findings }: { findings: FindingData[] }) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const byCategory: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity as keyof typeof bySeverity]++;
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
  }

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
        className="p-3 rounded-lg bg-gray-900/80 border border-gray-800"
      >
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Findings</div>
        <div className="text-2xl font-bold text-white font-mono">{findings.length}</div>
      </motion.div>
      {(['critical', 'high', 'medium', 'low', 'info'] as const).map((sev, i) => (
        <motion.div
          key={sev}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.05 }}
          className="p-3 rounded-lg bg-gray-900/80 border border-gray-800"
        >
          <div className={cn('text-xs uppercase tracking-wider mb-1', SEVERITY_COLORS[sev].text)}>{sev}</div>
          <div className={cn('text-2xl font-bold font-mono', SEVERITY_COLORS[sev].text)}>{bySeverity[sev]}</div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="col-span-2 lg:col-span-7 p-3 rounded-lg bg-gray-900/80 border border-gray-800"
      >
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Most Common Vulnerability Types</div>
        <div className="flex flex-wrap gap-2">
          {topCategories.map(([cat, count]) => (
            <span key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 text-xs text-gray-300">
              <span>{CATEGORY_ICONS[cat] || '🔍'}</span>
              <span className="uppercase">{cat}</span>
              <span className="text-gray-600 font-mono">({count})</span>
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main Component — ProofGallery
// ═══════════════════════════════════════════════════════════════════════

export function ProofGallery() {
  const [scans, setScans] = useState<ScanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [selectedFinding, setSelectedFinding] = useState<FindingData | null>(null);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [showGenerateAll, setShowGenerateAll] = useState(false);
  const [allFindings, setAllFindings] = useState<FindingData[]>([]);
  const [allDomain, setAllDomain] = useState('');

  // Fetch scans
  useEffect(() => {
    async function fetchScans() {
      try {
        const res = await fetch('/api/scans');
        if (res.ok) {
          const data = await res.json();
          setScans(data.scans || []);
        }
      } catch (err) {
        console.error('Failed to fetch scans:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchScans();
  }, []);

  // Flatten findings from scans that have critical/high/medium
  const proofEntries: { finding: FindingData; domain: string; scanDate: string }[] = [];
  for (const scan of scans) {
    const domain = scan.target?.domain || 'unknown';
    for (const f of scan.findings) {
      if (['critical', 'high', 'medium'].includes(f.severity)) {
        proofEntries.push({ finding: f, domain, scanDate: scan.startedAt });
      }
    }
  }

  // Apply severity filter
  const filtered = filter === 'all'
    ? proofEntries
    : proofEntries.filter(e => e.finding.severity === filter);

  // Stats
  const totalProofs = proofEntries.length;
  const bySeverity = { critical: 0, high: 0, medium: 0 };
  for (const e of proofEntries) {
    const s = e.finding.severity as keyof typeof bySeverity;
    if (s in bySeverity) bySeverity[s]++;
  }

  const handleGenerateAll = (domain: string, findings: FindingData[]) => {
    setAllDomain(domain);
    setAllFindings(findings);
    setShowGenerateAll(true);
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
          <p className="text-sm text-gray-500">Loading proof gallery...</p>
        </div>
      </div>
    );
  }

  // ── Empty State ──
  if (proofEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800">
          <Camera className="w-8 h-8 text-gray-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-300 mb-1">No Proof-Worthy Findings</h3>
          <p className="text-sm text-gray-600 max-w-md">
            Run a scan on a target to discover critical, high, or medium severity vulnerabilities.
            Those findings will appear here as shareable proof-of-exploit cards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20">
            <Film className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Proof Gallery</h2>
            <p className="text-xs text-gray-500">Generate shareable proof-of-exploit visuals from vulnerability findings</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Proof count badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
            <ImageIcon className="w-3.5 h-3.5 text-green-400" aria-hidden="true" />
            <span className="text-sm text-gray-300 font-mono">{totalProofs} proofs</span>
          </div>
          {totalProofs > 0 && (
            <button
              onClick={() => {
                const critHigh = proofEntries.filter(e =>
                  e.finding.severity === 'critical' || e.finding.severity === 'high',
                );
                if (critHigh.length > 0) {
                  handleGenerateAll(critHigh[0].domain, critHigh.map(e => e.finding));
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              Generate All
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <ProofStats findings={proofEntries.map(e => e.finding)} />

      {/* Severity Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        {(['all', 'critical', 'high', 'medium'] as const).map(f => {
          const count = f === 'all'
            ? totalProofs
            : bySeverity[f as 'critical' | 'high' | 'medium'];
          const c = f !== 'all' ? SEVERITY_COLORS[f] : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                filter === f
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : c
                    ? `${c.bg} ${c.border} ${c.text} hover:opacity-80`
                    : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700',
              )}
            >
              <span className="uppercase">{f}</span>
              <span className={cn('font-mono', filter === f ? 'text-gray-400' : 'opacity-70')}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((entry, i) => (
            <ProofCard
              key={entry.finding.id}
              finding={entry.finding}
              domain={entry.domain}
              scanDate={entry.scanDate}
              onClick={() => {
                setSelectedFinding(entry.finding);
                setSelectedDomain(entry.domain);
              }}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && proofEntries.length > 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-600">No findings match the selected severity filter.</p>
        </div>
      )}

      {/* Proof Generator Modal */}
      <AnimatePresence>
        {selectedFinding && (
          <ProofGenerator
            finding={selectedFinding}
            domain={selectedDomain}
            onClose={() => setSelectedFinding(null)}
          />
        )}
      </AnimatePresence>

      {/* Generate All Modal */}
      <AnimatePresence>
        {showGenerateAll && allFindings.length > 0 && (
          <GenerateAllModal
            findings={allFindings}
            domain={allDomain}
            onClose={() => setShowGenerateAll(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
