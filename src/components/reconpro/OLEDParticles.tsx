"use client";

import { useMemo } from "react";

export function OLEDParticles() {
  const particles = useMemo(() => {
    const items = [];
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = 1 + Math.random() * 2;
      const alpha = 0.03 + Math.random() * 0.1;
      const duration = 15 + Math.random() * 25;
      const delay = Math.random() * 20;
      const dx = -100 + Math.random() * 200;
      const dy = -100 + Math.random() * 200;
      items.push(
        <div
          key={i}
          className="oled-particle"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            "--size": `${size}px`,
            "--alpha": String(alpha),
            "--glow": `${size * 3}px`,
            "--duration": `${duration}s`,
            "--delay": `${delay}s`,
            "--drift-end": `translate(${dx}px, ${dy}px)`,
          } as React.CSSProperties}
        />
      );
    }
    return items;
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {particles}
    </div>
  );
}
