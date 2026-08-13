"use client";

import { useState, useEffect, memo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  alpha: number;
  duration: number;
  delay: number;
  dx: number;
  dy: number;
}

function generateParticles() {
  const particles: Particle[] = [];
  for (let i = 0; i < 30; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      alpha: 0.03 + Math.random() * 0.1,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * 20,
      dx: -100 + Math.random() * 200,
      dy: -100 + Math.random() * 200,
    });
  }
  return particles;
}

export const OLEDParticles = memo(function OLEDParticles() {
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    setParticles(generateParticles());  
  }, []);

  if (!particles) {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true" />
    );
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="oled-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            "--size": `${p.size}px`,
            "--alpha": String(p.alpha),
            "--glow": `${p.size * 3}px`,
            "--duration": `${p.duration}s`,
            "--delay": `${p.delay}s`,
            "--drift-end": `translate(${p.dx}px, ${p.dy}px)`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
});
