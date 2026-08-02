'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

interface NodeData {
  id: string;
  label: string;
  type: 'root' | 'subdomain' | 'port' | 'service' | 'vulnerability';
  severity?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface EdgeData {
  source: string;
  target: string;
}

interface AttackSurfaceProps {
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    asset: string;
  }>;
  domain: string;
  riskScore: number;
}

const severityNodeColors: Record<string, string> = {
  critical: '#ff3355',
  high: '#ff8844',
  medium: '#ffaa00',
  low: '#22c55e',
  info: '#6b7280',
};

export function AttackSurface({ findings, domain, riskScore }: AttackSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<NodeData[]>([]);
  const edgesRef = useRef<EdgeData[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  const { nodes, edges } = useMemo(() => {
    const n: NodeData[] = [];
    const e: EdgeData[] = [];
    const centerX = 0;
    const centerY = 0;

    // Root node
    n.push({
      id: 'root',
      label: domain,
      type: 'root',
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 30,
    });

    // Group findings by asset/category
    const subdomains = findings.filter(f => f.category === 'subdomain');
    const ports = findings.filter(f => f.category === 'port');
    const techs = findings.filter(f => f.category === 'technology');
    const vulns = findings.filter(f => ['vulnerability', 'header', 'ssl', 'dns'].includes(f.category));

    // Subdomain nodes - ring 1
    subdomains.forEach((f, i) => {
      const angle = (i / Math.max(subdomains.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const r = 140 + Math.random() * 40;
      const id = `sub-${i}`;
      n.push({
        id,
        label: f.asset.replace(/\..+$/, ''),
        type: 'subdomain',
        severity: f.severity,
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: f.severity === 'critical' ? 14 : f.severity === 'high' ? 12 : 10,
      });
      e.push({ source: 'root', target: id });
    });

    // Port nodes - ring 2
    ports.forEach((f, i) => {
      const angle = (i / Math.max(ports.length, 1)) * Math.PI * 2;
      const r = 260 + Math.random() * 30;
      const id = `port-${i}`;
      const portNum = f.asset.split(':').pop() || '80';
      n.push({
        id,
        label: `:${portNum}`,
        type: 'port',
        severity: f.severity,
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: f.severity === 'critical' ? 16 : 12,
      });
      // Connect to root or random subdomain
      if (subdomains.length > 0) {
        e.push({ source: `sub-${Math.floor(Math.random() * subdomains.length)}`, target: id });
      } else {
        e.push({ source: 'root', target: id });
      }
    });

    // Technology nodes - ring 3
    techs.slice(0, 10).forEach((f, i) => {
      const angle = (i / 10) * Math.PI * 2 + 0.3;
      const r = 200 + Math.random() * 60;
      const id = `tech-${i}`;
      n.push({
        id,
        label: f.asset.length > 12 ? f.asset.slice(0, 12) + '...' : f.asset,
        type: 'service',
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: 8,
      });
      e.push({ source: 'root', target: id });
    });

    // Vulnerability nodes - scattered
    vulns.slice(0, 8).forEach((f, i) => {
      const angle = (i / 8) * Math.PI * 2 + 1.5;
      const r = 300 + Math.random() * 50;
      const id = `vuln-${i}`;
      n.push({
        id,
        label: f.title.length > 18 ? f.title.slice(0, 18) + '...' : f.title,
        type: 'vulnerability',
        severity: f.severity,
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: f.severity === 'critical' ? 14 : f.severity === 'high' ? 11 : 9,
      });
      // Connect to nearest subdomain or root
      const target = subdomains.length > 0 ? `sub-${Math.floor(Math.random() * subdomains.length)}` : 'root';
      e.push({ source: target, target: id });
    });

    return { nodes: n, edges: e };
  }, [findings, domain]);

  useEffect(() => {
    nodesRef.current = nodes.map(n => ({ ...n }));
    edgesRef.current = edges;
  }, [nodes, edges]);

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

  useEffect(() => {
    if (dimensions.width === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Simple force simulation
    function simulate() {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      const nodeMap = new Map(ns.map(n => [n.id, n]));

      // Repulsion between nodes
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) dist = 1;
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }

      // Attraction along edges
      for (const edge of es) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) dist = 1;
        const force = (dist - 120) * 0.005;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Center gravity
      for (const n of ns) {
        if (n.type === 'root') {
          n.x = 0; n.y = 0; n.vx = 0; n.vy = 0;
          continue;
        }
        n.vx -= n.x * 0.001;
        n.vy -= n.y * 0.001;
        n.vx *= 0.9;
        n.vy *= 0.9;
        n.x += n.vx;
        n.y += n.vy;
      }
    }

    let time = 0;

    function draw() {
      time += 0.016;
      simulate();
      const ns = nodesRef.current;
      const es = edgesRef.current;
      const nodeMap = new Map(ns.map(n => [n.id, n]));

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.03)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < dimensions.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dimensions.height); ctx.stroke();
      }
      for (let y = 0; y < dimensions.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(dimensions.width, y); ctx.stroke();
      }

      // Draw concentric rings
      [140, 220, 320].forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.04 - i * 0.01})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw edges
      for (const edge of es) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;

        const ax = centerX + a.x, ay = centerY + a.y;
        const bx = centerX + b.x, by = centerY + b.y;

        // Animated dash
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.08 + Math.sin(time * 2) * 0.03})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.lineDashOffset = -time * 20;
        ctx.stroke();
        ctx.setLineDash([]);

        // Pulse dot along edge
        const t = ((time * 0.5) % 1);
        const px = ax + (bx - ax) * t;
        const py = ay + (by - ay) * t;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
        ctx.fill();
      }

      // Draw nodes
      for (const node of ns) {
        const nx = centerX + node.x;
        const ny = centerY + node.y;
        const isHovered = hoveredNode === node.id;
        const r = node.radius + (isHovered ? 3 : 0);

        let color = '#00ff88';
        let glowColor = 'rgba(0, 255, 136, 0.3)';

        if (node.severity) {
          color = severityNodeColors[node.severity] || color;
          glowColor = color.replace(')', ', 0.3)').replace('rgb', 'rgba');
        }
        if (node.type === 'service') {
          color = '#06b6d4';
          glowColor = 'rgba(6, 182, 212, 0.3)';
        }

        // Glow
        if (node.type !== 'service' || isHovered) {
          ctx.beginPath();
          ctx.arc(nx, ny, r + 8, 0, Math.PI * 2);
          ctx.fillStyle = glowColor;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(nx - r * 0.3, ny - r * 0.3, 0, nx, ny, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color.replace(')', ', 0.6)').replace('rgb', 'rgba'));
        ctx.fillStyle = grad;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered ? color : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Critical pulse ring
        if (node.severity === 'critical') {
          const pulseR = r + 8 + Math.sin(time * 3) * 5;
          ctx.beginPath();
          ctx.arc(nx, ny, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + Math.sin(time * 3) * 0.15})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.7)';
        ctx.font = `${node.type === 'root' ? 'bold 11px' : '10px'} "Geist Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (node.type === 'root') {
          ctx.fillText(node.label, nx, ny + r + 16);
        } else {
          ctx.fillText(node.label, nx, ny + r + 12);
        }

        // Type icon text
        if (node.type === 'port') {
          ctx.fillStyle = '#080a10';
          ctx.font = `bold 8px "Geist Mono", monospace`;
          ctx.fillText('PORT', nx, ny);
        } else if (node.type === 'vulnerability') {
          ctx.fillStyle = '#080a10';
          ctx.font = `bold 7px "Geist Sans", sans-serif`;
          ctx.fillText('VULN', nx, ny);
        } else if (node.type === 'root') {
          ctx.fillStyle = '#080a10';
          ctx.font = `bold 10px "Geist Sans", sans-serif`;
          ctx.fillText('ASN', nx, ny);
        }
      }

      // Root glow effect
      const rootGlow = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, 80);
      rootGlow.addColorStop(0, 'rgba(0, 255, 136, 0.08)');
      rootGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
      ctx.fillStyle = rootGlow;
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [dimensions, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    let found: string | null = null;
    for (const node of nodesRef.current) {
      const nx = cx + node.x;
      const ny = cy + node.y;
      const dx = mx - nx;
      const dy = my - ny;
      if (dx * dx + dy * dy < (node.radius + 5) * (node.radius + 5)) {
        found = node.id;
        break;
      }
    }
    setHoveredNode(found);
    mouseRef.current = { x: mx, y: my };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cyber-card rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse-glow" />
          <h3 className="text-sm font-semibold text-[#f0f0f0]">Attack Surface Map</h3>
          <span className="text-xs text-muted-foreground font-mono">{domain}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{nodes.length} nodes</span>
          <span>{edges.length} connections</span>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative" style={{ height: 500 }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
          className="w-full h-full"
          style={{ width: dimensions.width || '100%', height: dimensions.height || '100%' }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 border-t border-[rgba(255,255,255,0.04)]">
        <span className="text-xs text-muted-foreground">Severity:</span>
        {[
          { label: 'Critical', color: '#ff3355' },
          { label: 'High', color: '#ff8844' },
          { label: 'Medium', color: '#ffaa00' },
          { label: 'Low', color: '#22c55e' },
          { label: 'Info', color: '#6b7280' },
          { label: 'Tech', color: '#06b6d4' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}40` }} />
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}