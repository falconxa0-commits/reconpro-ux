'use client';

import { useEffect, useRef } from 'react';

interface RiskGaugeProps {
  value: number;
  size?: number;
  label?: string;
}

export function RiskGauge({ value, size = 180, label }: RiskGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2 + 10;
    const radius = size / 2 - 20;
    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const range = endAngle - startAngle;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Gradient arc
    const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(0.3, '#ffaa00');
    gradient.addColorStop(0.6, '#ff8844');
    gradient.addColorStop(1, '#ff3355');

    const valueAngle = startAngle + (value / 100) * range;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, valueAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow effect
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, valueAngle);
    ctx.lineWidth = 14;
    const glowColor = value > 70 ? 'rgba(239,68,68,0.3)' : value > 40 ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.3)';
    ctx.strokeStyle = glowColor;
    ctx.lineCap = 'round';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const angle = startAngle + (i / 10) * range;
      const innerR = radius - 22;
      const outerR = radius - 16;
      ctx.beginPath();
      ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
      ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();
    }

    // Center value
    ctx.fillStyle = value > 70 ? '#ff3355' : value > 40 ? '#ff8844' : '#00ff88';
    ctx.font = `bold ${size * 0.22}px "Geist Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = value > 70 ? 'rgba(239,68,68,0.5)' : value > 40 ? 'rgba(251,191,36,0.5)' : 'rgba(52,211,153,0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(value.toString(), cx, cy - 5);
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${size * 0.07}px "Geist Sans", sans-serif`;
    ctx.fillText('RISK SCORE', cx, cy + 25);

    // Min/Max labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${size * 0.065}px "Geist Sans", sans-serif`;
    ctx.fillText('0', cx + (radius - 8) * Math.cos(startAngle), cy + (radius - 8) * Math.sin(startAngle));
    ctx.fillText('100', cx + (radius - 8) * Math.cos(endAngle), cy + (radius - 8) * Math.sin(endAngle));
  }, [value, size]);

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      {label && <span className="text-xs text-muted-foreground font-mono tracking-wider uppercase">{label}</span>}
    </div>
  );
}