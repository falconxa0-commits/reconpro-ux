'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface RadarBlip {
  id: string;
  label: string;
  angle: number;      // 0-360 degrees
  distance: number;   // 0-1 (fraction of max radius)
  severity: string;
  category: string;
  brightness: number; // 0-1, peaks when sweep passes
  size: number;
  discovered: boolean;
}

interface RadarMapProps {
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    asset: string;
  }>;
  domain: string;
  isScanning?: boolean;
  height?: number;
}

const SEVERITY_RADAR_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#6b7280',
};

const CATEGORY_RADAR_DISTANCE: Record<string, number> = {
  vulnerability: 0.2,
  port: 0.4,
  subdomain: 0.6,
  ssl: 0.75,
  dns: 0.85,
  header: 0.9,
  technology: 0.95,
};

export function RadarMap({ findings, domain, isScanning = false, height = 520 }: RadarMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredBlip, setHoveredBlip] = useState<RadarBlip | null>(null);
  const blipsRef = useRef<RadarBlip[]>([]);
  const animRef = useRef<number>(0);
  const sweepAngleRef = useRef(0);
  const timeRef = useRef(0);
  const scanCountRef = useRef(0);

  // Convert findings to radar blips
  const blipData = useMemo(() => {
    if (findings.length === 0) return [];

    const seededRandom = (seed: string) => {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      return () => {
        hash = (hash * 1103515245 + 12345) & 0x7fffffff;
        return hash / 0x7fffffff;
      };
    };

    const rand = seededRandom(domain);
    return findings.map((f, i) => {
      const baseAngle = (i / findings.length) * 360;
      const jitter = (rand() - 0.5) * 25;
      const angle = (baseAngle + jitter + 360) % 360;
      const baseDist = CATEGORY_RADAR_DISTANCE[f.category] || 0.5;
      const distJitter = (rand() - 0.5) * 0.15;
      const distance = Math.max(0.1, Math.min(0.98, baseDist + distJitter));

      return {
        id: f.id,
        label: f.asset.length > 20 ? f.asset.slice(0, 20) : f.asset,
        angle,
        distance,
        severity: f.severity,
        category: f.category,
        brightness: 0,
        size: f.severity === 'critical' ? 5 : f.severity === 'high' ? 4.5 : f.severity === 'medium' ? 4 : 3,
        discovered: false,
      };
    });
  }, [findings, domain]);

  useEffect(() => {
    blipsRef.current = blipData.map(b => ({ ...b }));
  }, [blipData]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Main radar render loop
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
    const maxR = Math.min(cx, cy) - 30;
    const blips = blipsRef.current;

    function draw() {
      timeRef.current += 0.016;
      const t = timeRef.current;

      // Advance sweep (one full rotation every 4 seconds)
      sweepAngleRef.current = (sweepAngleRef.current + 0.45) % 360;
      const sweepRad = (sweepAngleRef.current - 90) * (Math.PI / 180);

      ctx.clearRect(0, 0, W, H);

      // ─── Background ───
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR + 30);
      bgGrad.addColorStop(0, 'rgba(0, 20, 10, 0.6)');
      bgGrad.addColorStop(0.7, 'rgba(0, 10, 5, 0.3)');
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ─── Range Rings ───
      const ringCount = 5;
      for (let i = 1; i <= ringCount; i++) {
        const r = (i / ringCount) * maxR;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 136, ${i === ringCount ? 0.15 : 0.06})`;
        ctx.lineWidth = i === ringCount ? 1.5 : 0.8;
        ctx.stroke();

        // Range label
        if (i < ringCount) {
          ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
          ctx.font = '9px "Geist Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${i * 20}%`, cx + r + 4, cy - 3);
        }
      }

      // ─── Cross-hair Lines ───
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.08)';
      ctx.lineWidth = 0.8;
      // Horizontal
      ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();
      // Vertical
      ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();
      // Diagonals
      const diag = maxR * 0.707;
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.04)';
      ctx.beginPath(); ctx.moveTo(cx - diag, cy - diag); ctx.lineTo(cx + diag, cy + diag); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + diag, cy - diag); ctx.lineTo(cx - diag, cy + diag); ctx.stroke();

      // ─── Bearing Labels ───
      ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
      ctx.font = 'bold 10px "Geist Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', cx, cy - maxR - 14);
      ctx.fillText('S', cx, cy + maxR + 14);
      ctx.textAlign = 'left';
      ctx.fillText('E', cx + maxR + 8, cy);
      ctx.textAlign = 'right';
      ctx.fillText('W', cx - maxR - 8, cy);

      // ─── Sweep Trail (gradient cone behind the beam) ───
      const trailAngle = 0.8; // radians (~45 degrees of trail)
      const trailSteps = 20;
      for (let i = 0; i < trailSteps; i++) {
        const t1 = i / trailSteps;
        const t2 = (i + 1) / trailSteps;
        const a1 = sweepRad - trailAngle * (1 - t1);
        const a2 = sweepRad - trailAngle * (1 - t2);
        const alpha = t2 * 0.12;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, a1, a2);
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.fill();
      }

      // ─── Sweep Beam (main line) ───
      const beamGrad = ctx.createLinearGradient(
        cx, cy,
        cx + maxR * Math.cos(sweepRad),
        cy + maxR * Math.sin(sweepRad)
      );
      beamGrad.addColorStop(0, 'rgba(0, 255, 136, 0.6)');
      beamGrad.addColorStop(0.5, 'rgba(0, 255, 136, 0.3)');
      beamGrad.addColorStop(1, 'rgba(0, 255, 136, 0.05)');

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(sweepRad), cy + maxR * Math.sin(sweepRad));
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Beam tip glow
      const tipX = cx + maxR * Math.cos(sweepRad);
      const tipY = cy + maxR * Math.sin(sweepRad);
      const tipGlow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 15);
      tipGlow.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
      tipGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(tipX, tipY, 15, 0, Math.PI * 2);
      ctx.fillStyle = tipGlow;
      ctx.fill();

      // ─── Center Point ───
      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
      centerGlow.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
      centerGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fill();

      // ─── Blips ───
      for (const blip of blips) {
        const blipAngleRad = (blip.angle - 90) * (Math.PI / 180);
        const bx = cx + blip.distance * maxR * Math.cos(blipAngleRad);
        const by = cy + blip.distance * maxR * Math.sin(blipAngleRad);

        // Calculate angular difference between sweep and blip
        let angleDiff = sweepAngleRef.current - blip.angle;
        if (angleDiff < 0) angleDiff += 360;
        if (angleDiff > 360) angleDiff -= 360;

        // Blip lights up when sweep passes (within ~30 degrees behind sweep)
        if (angleDiff < 30 && angleDiff >= 0) {
          blip.brightness = 1 - (angleDiff / 30);
          blip.discovered = true;
        } else {
          blip.brightness = Math.max(0, blip.brightness - 0.008);
        }

        const alpha = blip.discovered
          ? Math.max(0.15, blip.brightness)
          : 0;

        if (alpha <= 0) continue;

        const color = SEVERITY_RADAR_COLORS[blip.severity] || '#00ff88';
        const cr = parseInt(color.slice(1, 3), 16);
        const cg = parseInt(color.slice(3, 5), 16);
        const cb = parseInt(color.slice(5, 7), 16);
        const r = blip.size + blip.brightness * 3;

        // Outer glow
        if (blip.brightness > 0.3) {
          const glowGrad = ctx.createRadialGradient(bx, by, 0, bx, by, r + 14);
          glowGrad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha * 0.35})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(bx, by, r + 14, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // Blip dot
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.fill();

        // Inner bright core
        ctx.beginPath();
        ctx.arc(bx, by, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
        ctx.fill();

        // Critical blip: pulsing ring
        if (blip.severity === 'critical' && blip.brightness > 0.1) {
          const pulseR = r + 6 + Math.sin(t * 4) * 4;
          ctx.beginPath();
          ctx.arc(bx, by, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239,68,68,${alpha * 0.4})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Label for bright blips
        if (blip.brightness > 0.5 && blip.discovered) {
          ctx.fillStyle = `rgba(230,237,243,${blip.brightness * 0.8})`;
          ctx.font = '9px "Geist Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(blip.label, bx + r + 6, by);
        }

        // Tiny connecting line to center for very bright blips
        if (blip.brightness > 0.7) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(blip.brightness - 0.7) * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // ─── Scanning Effect ───
      if (isScanning) {
        scanCountRef.current += 1;
        // Periodically add "new" blips during scan
        if (scanCountRef.current % 30 === 0 && blips.length > 0) {
          const undiscovered = blips.filter(b => !b.discovered);
          if (undiscovered.length > 0) {
            const next = undiscovered[Math.floor(Math.random() * undiscovered.length)];
            next.discovered = true;
            next.brightness = 1;
          }
        }

        // Scanning indicator ring
        const scanPulse = Math.sin(t * 3) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.1 + scanPulse * 0.1})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -t * 30;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ─── HUD Overlay Corners ───
      const cornerLen = 20;
      const cornerOff = 8;
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
      ctx.lineWidth = 1.5;
      // Top-left
      ctx.beginPath(); ctx.moveTo(cornerOff, cornerOff + cornerLen); ctx.lineTo(cornerOff, cornerOff); ctx.lineTo(cornerOff + cornerLen, cornerOff); ctx.stroke();
      // Top-right
      ctx.beginPath(); ctx.moveTo(W - cornerOff - cornerLen, cornerOff); ctx.lineTo(W - cornerOff, cornerOff); ctx.lineTo(W - cornerOff, cornerOff + cornerLen); ctx.stroke();
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(cornerOff, H - cornerOff - cornerLen); ctx.lineTo(cornerOff, H - cornerOff); ctx.lineTo(cornerOff + cornerLen, H - cornerOff); ctx.stroke();
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(W - cornerOff - cornerLen, H - cornerOff); ctx.lineTo(W - cornerOff, H - cornerOff); ctx.lineTo(W - cornerOff, H - cornerOff - cornerLen); ctx.stroke();

      // ─── HUD Text ───
      ctx.fillStyle = 'rgba(0, 255, 136, 0.5)';
      ctx.font = '9px "Geist Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BRG: ${sweepAngleRef.current.toFixed(1)}°`, 16, H - 20);
      ctx.fillText(`RNG: ${maxR}px`, 16, H - 8);
      ctx.textAlign = 'right';
      ctx.fillText(`TARGET: ${domain.toUpperCase()}`, W - 16, H - 20);
      ctx.fillText(`T+: ${t.toFixed(1)}s`, W - 16, H - 8);
      ctx.textAlign = 'left';
      ctx.fillText(isScanning ? 'STATUS: SCANNING' : 'STATUS: MONITORING', 16, 22);

      // Blip count
      const discoveredCount = blips.filter(b => b.discovered).length;
      ctx.textAlign = 'right';
      ctx.fillText(`CONTACTS: ${discoveredCount}/${blips.length}`, W - 16, 22);

      animRef.current = requestAnimationFrame(draw);
    }

    function safeDraw() {
      try { draw(); } catch (e) { console.error('Radar draw error:', e); }
    }

    safeDraw();
    return () => cancelAnimationFrame(animRef.current);
  }, [dimensions, domain, isScanning]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const maxR = Math.min(cx, cy) - 30;

    let found: RadarBlip | null = null;
    for (const blip of blipsRef.current) {
      const blipAngleRad = (blip.angle - 90) * (Math.PI / 180);
      const bx = cx + blip.distance * maxR * Math.cos(blipAngleRad);
      const by = cy + blip.distance * maxR * Math.sin(blipAngleRad);
      const dx = mx - bx;
      const dy = my - by;
      if (dx * dx + dy * dy < 100) {
        found = blip;
        break;
      }
    }
    setHoveredBlip(found);
  };

  const discoveredCount = blipData.length > 0 ? blipData.filter(b => true).length : 0;
  const critCount = blipData.filter(b => b.severity === 'critical').length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="cyber-card rounded-2xl overflow-hidden relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-[#00ff88] animate-pulse-glow' : 'bg-[#00ff88]/50'}`} />
          <h3 className="text-sm font-semibold text-[#e6edf3]">Radar Mapping</h3>
          <span className="text-xs text-muted-foreground font-mono">{domain}</span>
          {isScanning && (
            <Badge variant="outline" className="text-[10px] px-2 py-0 border-[#00ff88]/30 text-[#00ff88] animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{discoveredCount} contacts</span>
          {critCount > 0 && (
            <span className="text-[#ef4444]">{critCount} critical</span>
          )}
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
            className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg bg-[#161b22]/95 border border-[rgba(0,255,136,0.2)] backdrop-blur-sm text-xs max-w-[220px]"
            style={{
              left: '50%',
              bottom: 16,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-mono text-[#e6edf3] mb-1 truncate">{hoveredBlip.label}</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                hoveredBlip.severity === 'critical' ? 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30' :
                hoveredBlip.severity === 'high' ? 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30' :
                'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30'
              }`}>
                {hoveredBlip.severity.toUpperCase()}
              </Badge>
              <span className="text-muted-foreground">{hoveredBlip.category}</span>
              <span className="text-[#06b6d4] font-mono">{hoveredBlip.distance.toFixed(2)} rng</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-muted-foreground">Range:</span>
          {[
            { label: '0-20% Vulns', c: '#ef4444' },
            { label: '20-40% Ports', c: '#f97316' },
            { label: '40-60% Subs', c: '#eab308' },
            { label: '60-80% SSL/DNS', c: '#22c55e' },
            { label: '80-100% Tech', c: '#6b7280' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.c }} />
              <span className="text-[10px] text-muted-foreground hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          SWEEP ACTIVE
        </div>
      </div>
    </motion.div>
  );
}