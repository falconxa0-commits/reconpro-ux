'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────

interface RadarBlip {
  id: string;
  label: string;
  fullLabel: string;
  angle: number;          // degrees 0-360, 0 = north
  distance: number;       // 0-1 fraction of max radius
  severity: string;
  category: string;
  brightness: number;     // 0-1 peaks on sweep pass
  size: number;
  discovered: boolean;
  discoveredAt: number;   // timestamp when first hit by sweep
  pingPhase: number;      // ripple animation phase
  signalStrength: number; // 0-1 simulated signal
}

interface RadarMapProps {
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    description?: string;
    asset: string;
  }>;
  domain: string;
  isScanning?: boolean;
  height?: number;
}

// ─── Constants ───────────────────────────────────────────────────────

const SEV_COLORS: Record<string, string> = {
  critical: '#ff3355',
  high: '#ff8844',
  medium: '#ffaa00',
  low: '#00ff88',
  info: '#6b7280',
};

const CAT_DISTANCE: Record<string, number> = {
  vulnerability: 0.18,
  header: 0.32,
  port: 0.45,
  ssl: 0.58,
  dns: 0.68,
  subdomain: 0.78,
  technology: 0.92,
};

const CAT_SYMBOL: Record<string, string> = {
  vulnerability: '\u25C6', // diamond
  port: '\u25A0',         // square
  subdomain: '\u25CF',    // circle
  ssl: '\u25B2',          // triangle
  dns: '\u25C7',          // diamond outline
  header: '\u25CB',       // circle outline
  technology: '\u25A1',   // square outline
};

const DEG = Math.PI / 180;

// ─── Component ───────────────────────────────────────────────────────

export function RadarMap({ findings, domain, isScanning = false, height = 560 }: RadarMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredBlip, setHoveredBlip] = useState<RadarBlip | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const blipsRef = useRef<RadarBlip[]>([]);
  const animRef = useRef<number>(0);
  const sweepRef = useRef(0);
  const timeRef = useRef(0);
  const discoveredOrderRef = useRef<string[]>([]);
  const pingsRef = useRef<Array<{ x: number; y: number; r: number; alpha: number; color: string }>>([]);

  // ── Seed-based deterministic placement ──
  const blipData = useMemo(() => {
    if (findings.length === 0) return [];

    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      hash = ((hash << 5) - hash) + domain.charCodeAt(i);
      hash |= 0;
    }
    const rand = () => {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      return hash / 0x7fffffff;
    };

    // Group by category for sector placement
    const byCategory: Record<string, typeof findings> = {};
    for (const f of findings) {
      (byCategory[f.category] ??= []).push(f);
    }

    const result: RadarBlip[] = [];
    const catKeys = Object.keys(CAT_DISTANCE);
    let globalIdx = 0;

    for (const cat of catKeys) {
      const items = byCategory[cat] || [];
      const baseDistance = CAT_DISTANCE[cat];
      const sectorStart = catKeys.indexOf(cat) * (360 / catKeys.length);

      for (let i = 0; i < items.length; i++) {
        const f = items[i];
        const sectorAngle = sectorStart + (i / Math.max(items.length, 1)) * (360 / catKeys.length);
        const jitter = (rand() - 0.5) * 18;
        const angle = ((sectorAngle + jitter) % 360 + 360) % 360;
        const distJitter = (rand() - 0.5) * 0.1;
        const distance = Math.max(0.08, Math.min(0.97, baseDistance + distJitter));

        result.push({
          id: f.id,
          label: f.asset.length > 22 ? f.asset.slice(0, 22) + '..' : f.asset,
          fullLabel: f.asset,
          angle,
          distance,
          severity: f.severity,
          category: f.category,
          brightness: 0,
          size: f.severity === 'critical' ? 5.5 : f.severity === 'high' ? 4.5 : f.severity === 'medium' ? 4 : 3.2,
          discovered: false,
          discoveredAt: 0,
          pingPhase: 0,
          signalStrength: 0.5 + rand() * 0.5,
        });
        globalIdx++;
      }
    }
    return result;
  }, [findings, domain]);

  useEffect(() => {
    blipsRef.current = blipData.map(b => ({ ...b }));
    discoveredOrderRef.current = [];
  }, [blipData]);

  // ── Resize ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Main render loop ──
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const W = dimensions.width;
    const H = dimensions.height;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(cx, cy) - 36;
    const blips = blipsRef.current;
    const pings = pingsRef.current;

    let lastTs = 0;

    function draw(ts: number) {
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
      lastTs = ts;
      timeRef.current += dt;
      const t = timeRef.current;

      // Sweep: one rotation every 5 seconds
      sweepRef.current = (sweepRef.current + dt * 72) % 360;
      const sweepRad = sweepRef.current * DEG;

      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // ──────────────────────────────────
      // 1. RADAR SCREEN BACKGROUND
      // ──────────────────────────────────

      // Dark CRT-style background with vignette
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR + 40);
      bgGrad.addColorStop(0, '#040a06');
      bgGrad.addColorStop(0.85, '#020804');
      bgGrad.addColorStop(1, '#010302');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR + 6, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring bezel
      ctx.beginPath();
      ctx.arc(cx, cy, maxR + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, maxR + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ──────────────────────────────────
      // 2. SWEEP TRAIL (phosphor afterglow)
      // ──────────────────────────────────
      // We draw the trail as many thin arc slices going backwards
      const trailSpan = 60 * DEG; // 60 degree trail
      const trailSteps = 40;
      for (let i = 0; i < trailSteps; i++) {
        const frac0 = i / trailSteps;
        const frac1 = (i + 1) / trailSteps;
        const a0 = sweepRad - trailSpan * (1 - frac0);
        const a1 = sweepRad - trailSpan * (1 - frac1);
        const alpha = frac1 * 0.18;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, a0, a1);
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.fill();
      }

      // ──────────────────────────────────
      // 3. RANGE RINGS
      // ──────────────────────────────────
      const rings = 5;
      for (let i = 1; i <= rings; i++) {
        const r = (i / rings) * maxR;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = i === rings ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 255, 136, 0.07)';
        ctx.lineWidth = i === rings ? 1.5 : 0.7;
        ctx.stroke();

        // Tick marks every 10 degrees on outer ring
        if (i === rings) {
          for (let deg = 0; deg < 360; deg += 10) {
            const rad = deg * DEG;
            const inner = maxR - (deg % 30 === 0 ? 8 : 4);
            ctx.beginPath();
            ctx.moveTo(cx + inner * Math.cos(rad), cy + inner * Math.sin(rad));
            ctx.lineTo(cx + r * Math.cos(rad), cy + r * Math.sin(rad));
            ctx.strokeStyle = deg % 30 === 0 ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 255, 136, 0.08)';
            ctx.lineWidth = deg % 30 === 0 ? 1 : 0.5;
            ctx.stroke();
          }
        }
      }

      // ──────────────────────────────────
      // 4. RANGE LABELS
      // ──────────────────────────────────
      ctx.fillStyle = 'rgba(0, 255, 136, 0.22)';
      ctx.font = '8px "Geist Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      for (let i = 1; i <= rings; i++) {
        const r = (i / rings) * maxR;
        ctx.fillText(`${i * 20}%`, cx + r + 5, cy - 3);
      }

      // ──────────────────────────────────
      // 5. CROSS-HAIR & SECTOR LINES
      // ──────────────────────────────────
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
      ctx.lineWidth = 0.7;
      // Cardinal lines
      for (let a = 0; a < 360; a += 90) {
        const rad = a * DEG;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxR * Math.cos(rad), cy + maxR * Math.sin(rad));
        ctx.stroke();
      }
      // Diagonal lines (faint)
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.04)';
      for (let a = 45; a < 360; a += 90) {
        const rad = a * DEG;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxR * Math.cos(rad), cy + maxR * Math.sin(rad));
        ctx.stroke();
      }

      // ──────────────────────────────────
      // 6. BEARING LABELS (compass rose)
      // ──────────────────────────────────
      ctx.font = 'bold 11px "Geist Mono", monospace';
      ctx.textBaseline = 'middle';
      const labelR = maxR + 20;
      const directions = [
        { text: 'N', angle: 0, align: 'center' as CanvasTextAlign, base: 'alphabetic' as CanvasTextBaseline },
        { text: 'E', angle: 90, align: 'left' as CanvasTextAlign, base: 'middle' as CanvasTextBaseline },
        { text: 'S', angle: 180, align: 'center' as CanvasTextAlign, base: 'hanging' as CanvasTextBaseline },
        { text: 'W', angle: 270, align: 'right' as CanvasTextAlign, base: 'middle' as CanvasTextBaseline },
      ];
      for (const d of directions) {
        const rad = d.angle * DEG;
        const lx = cx + labelR * Math.cos(rad);
        const ly = cy + labelR * Math.sin(rad);
        ctx.textAlign = d.align;
        ctx.textBaseline = d.base;
        ctx.fillStyle = d.text === 'N' ? '#00ff88' : 'rgba(0, 255, 136, 0.45)';
        ctx.fillText(d.text, lx, ly);
      }

      // Degree labels around the outside
      ctx.font = '7px "Geist Mono", monospace';
      ctx.fillStyle = 'rgba(0, 255, 136, 0.18)';
      ctx.textBaseline = 'middle';
      for (let deg = 30; deg < 360; deg += 30) {
        if (deg % 90 === 0) continue;
        const rad = deg * DEG;
        const lx = cx + (maxR + 18) * Math.cos(rad);
        const ly = cy + (maxR + 18) * Math.sin(rad);
        ctx.textAlign = Math.abs(Math.cos(rad)) < 0.01 ? 'center' : Math.cos(rad) > 0 ? 'left' : 'right';
        ctx.fillText(`${String(deg).padStart(3, '0')}`, lx, ly);
      }

      // ──────────────────────────────────
      // 7. SWEEP BEAM LINE
      // ──────────────────────────────────
      const beamEndX = cx + maxR * Math.cos(sweepRad);
      const beamEndY = cy + maxR * Math.sin(sweepRad);

      // Beam glow (wide, faint)
      const beamGlow = ctx.createLinearGradient(cx, cy, beamEndX, beamEndY);
      beamGlow.addColorStop(0, 'rgba(0, 255, 136, 0.0)');
      beamGlow.addColorStop(0.3, 'rgba(0, 255, 136, 0.08)');
      beamGlow.addColorStop(1, 'rgba(0, 255, 136, 0.02)');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(beamEndX, beamEndY);
      ctx.strokeStyle = beamGlow;
      ctx.lineWidth = 12;
      ctx.stroke();

      // Main beam (sharp)
      const beamSharp = ctx.createLinearGradient(cx, cy, beamEndX, beamEndY);
      beamSharp.addColorStop(0, 'rgba(0, 255, 136, 0.8)');
      beamSharp.addColorStop(0.4, 'rgba(0, 255, 136, 0.45)');
      beamSharp.addColorStop(1, 'rgba(0, 255, 136, 0.1)');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(beamEndX, beamEndY);
      ctx.strokeStyle = beamSharp;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Beam tip glow
      const tipGlow = ctx.createRadialGradient(beamEndX, beamEndY, 0, beamEndX, beamEndY, 20);
      tipGlow.addColorStop(0, 'rgba(0, 255, 136, 0.25)');
      tipGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(beamEndX, beamEndY, 20, 0, Math.PI * 2);
      ctx.fillStyle = tipGlow;
      ctx.fill();

      // ──────────────────────────────────
      // 8. BLIPS (radar contacts)
      // ──────────────────────────────────
      for (const blip of blips) {
        const blipRad = blip.angle * DEG;
        const bx = cx + blip.distance * maxR * Math.cos(blipRad);
        const by = cy + blip.distance * maxR * Math.sin(blipRad);

        // Angular diff between sweep and blip
        let angleDiff = sweepRef.current - blip.angle;
        if (angleDiff < 0) angleDiff += 360;
        if (angleDiff > 360) angleDiff -= 360;

        // Blip illuminates when sweep passes (within 25 degrees behind)
        const hitWindow = 25;
        if (angleDiff < hitWindow && angleDiff >= 0) {
          const wasDiscovered = blip.discovered;
          blip.brightness = 1 - (angleDiff / hitWindow);
          blip.discovered = true;

          // First discovery: trigger ping + add to order
          if (!wasDiscovered) {
            blip.discoveredAt = t;
            blip.pingPhase = 1;
            discoveredOrderRef.current.push(blip.id);
            const color = SEV_COLORS[blip.severity] || '#00ff88';
            pings.push({ x: bx, y: by, r: 0, alpha: 0.8, color });
          }
        } else {
          // Slow decay
          blip.brightness = Math.max(0, blip.brightness - dt * 0.25);
        }

        // Ping ripple animation
        if (blip.pingPhase > 0) {
          blip.pingPhase = Math.max(0, blip.pingPhase - dt * 1.2);
          const pingR = (1 - blip.pingPhase) * 30;
          const pingAlpha = blip.pingPhase * 0.5;
          const color = SEV_COLORS[blip.severity] || '#00ff88';
          const pr = parseInt(color.slice(1, 3), 16);
          const pg = parseInt(color.slice(3, 5), 16);
          const pb = parseInt(color.slice(5, 7), 16);

          ctx.beginPath();
          ctx.arc(bx, by, pingR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${pr},${pg},${pb},${pingAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Second ring
          if (blip.pingPhase < 0.7) {
            const ping2R = (1 - blip.pingPhase * 1.3) * 25;
            if (ping2R > 0) {
              ctx.beginPath();
              ctx.arc(bx, by, ping2R, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(${pr},${pg},${pb},${pingAlpha * 0.4})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }

        // Only draw if discovered
        if (!blip.discovered) continue;

        const alpha = Math.max(0.12, blip.brightness);
        const color = SEV_COLORS[blip.severity] || '#00ff88';
        const cr = parseInt(color.slice(1, 3), 16);
        const cg = parseInt(color.slice(3, 5), 16);
        const cb = parseInt(color.slice(5, 7), 16);
        const r = blip.size * (0.7 + blip.brightness * 0.5);

        // Signal noise: slight random position jitter for low-signal blips
        const noiseAmp = (1 - blip.signalStrength) * 1.5;
        const jx = blip.brightness > 0.3 ? 0 : (Math.sin(t * 20 + blip.angle) * noiseAmp);
        const jy = blip.brightness > 0.3 ? 0 : (Math.cos(t * 18 + blip.angle * 2) * noiseAmp);

        const fx = bx + jx;
        const fy = by + jy;

        // Outer glow (when bright)
        if (blip.brightness > 0.2) {
          const glowR = r + 12 + blip.brightness * 8;
          const glowGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowR);
          glowGrad.addColorStop(0, `rgba(${cr},${cg},${cb},${blip.brightness * 0.3})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(fx, fy, glowR, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // Blip body
        ctx.beginPath();
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.fill();

        // White-hot core (bright blips)
        if (blip.brightness > 0.4) {
          ctx.beginPath();
          ctx.arc(fx, fy, r * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${blip.brightness * 0.7})`;
          ctx.fill();
        }

        // Critical: pulsing warning ring
        if (blip.severity === 'critical' && blip.brightness > 0.05) {
          const pulseR = r + 8 + Math.sin(t * 5) * 4;
          ctx.beginPath();
          ctx.arc(fx, fy, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239,68,68,${Math.max(0.08, blip.brightness * 0.5)})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Second pulse ring offset
          const pulse2R = r + 12 + Math.sin(t * 5 + 1) * 3;
          ctx.beginPath();
          ctx.arc(fx, fy, pulse2R, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239,68,68,${Math.max(0.04, blip.brightness * 0.25)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        // High severity: single pulse
        if (blip.severity === 'high' && blip.brightness > 0.1) {
          const hPulseR = r + 6 + Math.sin(t * 3.5) * 3;
          ctx.beginPath();
          ctx.arc(fx, fy, hPulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(251,191,36,${Math.max(0.05, blip.brightness * 0.3)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }

        // Label (visible when bright enough)
        if (blip.brightness > 0.35) {
          const labelAlpha = (blip.brightness - 0.35) * 1.2;
          ctx.fillStyle = `rgba(230,237,243,${Math.min(1, labelAlpha)})`;
          ctx.font = '8px "Geist Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          // Background for readability
          const labelText = blip.label;
          const metrics = ctx.measureText(labelText);
          ctx.fillStyle = `rgba(4,10,6,${labelAlpha * 0.6})`;
          ctx.fillRect(fx + r + 5, fy - 6, metrics.width + 4, 12);

          ctx.fillStyle = `rgba(230,237,243,${Math.min(1, labelAlpha * 0.9)})`;
          ctx.fillText(labelText, fx + r + 7, fy);
        }

        // Connecting line to center for very bright blips
        if (blip.brightness > 0.6) {
          const lineAlpha = (blip.brightness - 0.6) * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(fx, fy);
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${lineAlpha})`;
          ctx.lineWidth = 0.4;
          ctx.setLineDash([2, 6]);
          ctx.lineDashOffset = -t * 30;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
        }
      }

      // ──────────────────────────────────
      // 9. PING RIPPLES (global)
      // ──────────────────────────────────
      for (let i = pings.length - 1; i >= 0; i--) {
        const p = pings[i];
        p.r += dt * 80;
        p.alpha -= dt * 0.6;
        if (p.alpha <= 0) { pings.splice(i, 1); continue; }
        const pr = parseInt(p.color.slice(1, 3), 16);
        const pg = parseInt(p.color.slice(3, 5), 16);
        const pb = parseInt(p.color.slice(5, 7), 16);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${pr},${pg},${pb},${p.alpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ──────────────────────────────────
      // 10. CENTER POINT & DOMAIN LABEL
      // ──────────────────────────────────
      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25);
      centerGlow.addColorStop(0, 'rgba(0, 255, 136, 0.2)');
      centerGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      // Center cross
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fill();

      // Domain label below center
      ctx.font = 'bold 9px "Geist Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(0, 255, 136, 0.5)';
      ctx.fillText(domain.toUpperCase(), cx, cy + 12);

      // ──────────────────────────────────
      // 11. SCANNING INDICATOR
      // ──────────────────────────────────
      if (isScanning) {
        const scanPulse = Math.sin(t * 4) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR + 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.08 + scanPulse * 0.08})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -t * 40;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // "SCANNING" text flash
        if (Math.sin(t * 6) > 0) {
          ctx.font = 'bold 10px "Geist Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = `rgba(0, 255, 136, ${0.4 + scanPulse * 0.3})`;
          ctx.fillText('SCANNING', cx, cy + maxR + 28);
        }
      }

      // ──────────────────────────────────
      // 12. HUD OVERLAY
      // ──────────────────────────────────

      // Corner brackets
      const cLen = 22;
      const cOff = 10;
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.18)';
      ctx.lineWidth = 1.5;
      // TL
      ctx.beginPath(); ctx.moveTo(cOff, cOff + cLen); ctx.lineTo(cOff, cOff); ctx.lineTo(cOff + cLen, cOff); ctx.stroke();
      // TR
      ctx.beginPath(); ctx.moveTo(W - cOff - cLen, cOff); ctx.lineTo(W - cOff, cOff); ctx.lineTo(W - cOff, cOff + cLen); ctx.stroke();
      // BL
      ctx.beginPath(); ctx.moveTo(cOff, H - cOff - cLen); ctx.lineTo(cOff, H - cOff); ctx.lineTo(cOff + cLen, H - cOff); ctx.stroke();
      // BR
      ctx.beginPath(); ctx.moveTo(W - cOff - cLen, H - cOff); ctx.lineTo(W - cOff, H - cOff); ctx.lineTo(W - cOff, H - cOff - cLen); ctx.stroke();

      // Top-left HUD data
      ctx.font = '8px "Geist Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
      ctx.fillText(isScanning ? 'MODE: ACTIVE SCAN' : 'MODE: PASSIVE MONITOR', 18, 18);
      ctx.fillText(`BRG: ${String(Math.floor(sweepRef.current)).padStart(3, '0')}\u00B0`, 18, 32);

      const discoveredCount = blips.filter(b => b.discovered).length;
      ctx.fillText(`CONTACTS: ${discoveredCount}/${blips.length}`, 18, 46);

      // Bottom-left HUD
      ctx.textBaseline = 'bottom';
      ctx.fillText(`FREQ: ${(2.4 + Math.sin(t * 0.1) * 0.01).toFixed(3)} GHz`, 18, H - 14);
      ctx.fillText(`GAIN: ${(38 + Math.sin(t * 0.3) * 2).toFixed(1)} dB`, 18, H - 28);

      // Top-right HUD
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
      ctx.fillText(`TARGET: ${domain.toUpperCase()}`, W - 18, 18);
      ctx.fillText(`T+ ${t.toFixed(1)}s`, W - 18, 32);

      // Bottom-right HUD
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
      const rotCount = Math.floor(sweepRef.current / 360);
      ctx.fillText(`ROT: ${rotCount + 1} | SWEEP: ${sweepRef.current.toFixed(0)}\u00B0`, W - 18, H - 14);
      const critBlips = blips.filter(b => b.discovered && b.severity === 'critical').length;
      if (critBlips > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.fillText(`! ${critBlips} CRITICAL CONTACTS`, W - 18, H - 28);
      }

      // ──────────────────────────────────
      // 13. NOISE / SCAN LINES (CRT effect)
      // ──────────────────────────────────
      // Very subtle horizontal scan lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }

      // Occasional noise flicker
      if (Math.random() < 0.02) {
        const noiseY = Math.random() * H;
        const noiseH = 1 + Math.random() * 2;
        ctx.fillStyle = `rgba(0, 255, 136, ${0.02 + Math.random() * 0.03})`;
        ctx.fillRect(0, noiseY, W, noiseH);
      }

      animRef.current = requestAnimationFrame(draw);
    }

    function safeDraw(ts: number) {
      try { draw(ts); } catch (e) { console.error('Radar error:', e); }
    }

    animRef.current = requestAnimationFrame(safeDraw);
    return () => cancelAnimationFrame(animRef.current);
  }, [dimensions, domain, isScanning]);

  // ── Mouse interaction ──
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const maxR = Math.min(cx, cy) - 36;

    let found: RadarBlip | null = null;
    for (const blip of blipsRef.current) {
      if (!blip.discovered) continue;
      const rad = blip.angle * DEG;
      const bx = cx + blip.distance * maxR * Math.cos(rad);
      const by = cy + blip.distance * maxR * Math.sin(rad);
      const dx = mx - bx;
      const dy = my - by;
      if (dx * dx + dy * dy < 120) {
        found = blip;
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        break;
      }
    }
    setHoveredBlip(found);
  }, [dimensions]);

  const discoveredCount = blipData.filter(b => true).length;
  const critCount = blipData.filter(b => b.severity === 'critical').length;
  const highCount = blipData.filter(b => b.severity === 'high').length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="cyber-card rounded-2xl overflow-hidden relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-[#00ff88] animate-pulse-glow' : 'bg-[#00ff88]/50'}`} />
          <h3 className="text-sm font-semibold text-[#f0f0f0]">Radar Mapping</h3>
          <span className="text-xs text-muted-foreground font-mono">{domain}</span>
          {isScanning && (
            <Badge variant="outline" className="text-[10px] px-2 py-0 border-[#00ff88]/30 text-[#00ff88] animate-pulse">
              LIVE SCAN
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono">{discoveredCount} contacts</span>
          {critCount > 0 && <span className="text-[#ff3355] font-mono">{critCount} crit</span>}
          {highCount > 0 && <span className="text-[#ff8844] font-mono">{highCount} high</span>}
        </div>
      </div>

      {/* Radar Canvas */}
      <div ref={containerRef} className="relative" style={{ height }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredBlip(null)}
          className="w-full h-full cursor-crosshair"
        />

        {/* Hovered blip tooltip */}
        {hoveredBlip && (
          <div
            className="absolute pointer-events-none z-10 px-3 py-2.5 rounded-lg bg-[#0a120d]/95 border border-[rgba(52,211,153,0.25)] backdrop-blur-sm max-w-[260px]"
            style={{
              left: Math.min(tooltipPos.x + 16, dimensions.width - 270),
              top: Math.max(tooltipPos.y - 50, 8),
            }}
          >
            <div className="font-mono text-[#f0f0f0] text-xs mb-1.5 truncate">{hoveredBlip.fullLabel}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                hoveredBlip.severity === 'critical' ? 'bg-[#ff3355]/15 text-[#ff3355] border-[#ff3355]/30' :
                hoveredBlip.severity === 'high' ? 'bg-[#ff8844]/15 text-[#ff8844] border-[#ff8844]/30' :
                hoveredBlip.severity === 'medium' ? 'bg-[#ffaa00]/15 text-[#ffaa00] border-[#ffaa00]/30' :
                hoveredBlip.severity === 'low' ? 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/30' :
                'bg-[#6b7280]/15 text-[#6b7280] border-[#6b7280]/30'
              }`}>
                {hoveredBlip.severity.toUpperCase()}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{hoveredBlip.category}</span>
              <span className="text-[10px] text-[#44aaff] font-mono">BRG {Math.floor(hoveredBlip.angle)}\u00B0</span>
              <span className="text-[10px] text-[#44aaff] font-mono">RNG {(hoveredBlip.distance * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-muted-foreground">Signal:</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-3 rounded-sm"
                    style={{
                      backgroundColor: i <= Math.ceil(hoveredBlip.signalStrength * 5)
                        ? (SEV_COLORS[hoveredBlip.severity] || '#00ff88')
                        : 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No data overlay */}
        {findings.length === 0 && !isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="text-muted-foreground/30 text-sm font-mono mb-2">NO CONTACTS DETECTED</div>
              <div className="text-muted-foreground/20 text-xs">Run a scan to populate the radar</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Range:</span>
          {[
            { label: 'Vulns', c: '#ff3355' },
            { label: 'Headers', c: '#ff8844' },
            { label: 'Ports', c: '#ffaa00' },
            { label: 'SSL', c: '#00ff88' },
            { label: 'DNS', c: '#a78bfa' },
            { label: 'Subs', c: '#ffaa00' },
            { label: 'Tech', c: '#6b7280' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.c, boxShadow: `0 0 4px ${s.c}40` }} />
              <span className="text-[9px] text-muted-foreground hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          SWEEP ACTIVE
        </div>
      </div>
    </motion.div>
  );
}