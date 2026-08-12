"use client";

import { useMemo } from "react";

export function NeuralNetwork() {
  const lines = useMemo(() => {
    const items = [];
    for (let i = 0; i < 12; i++) {
      const y = 10 + Math.random() * 80;
      const width = 100 + Math.random() * 400;
      const x = Math.random() * 100;
      const speed = 4 + Math.random() * 8;
      const delay = Math.random() * 10;
      const alpha = 0.015 + Math.random() * 0.035;
      items.push(
        <div
          key={i}
          className="neural-line"
          style={{
            top: `${y}%`,
            left: `${x}%`,
            width: `${width}px`,
            "--neural-speed": `${speed}s`,
            "--neural-delay": `${delay}s`,
            "--neural-alpha": String(alpha),
            transform: `rotate(${-15 + Math.random() * 30}deg)`,
          } as React.CSSProperties}
        />
      );
    }
    return items;
  }, []);

  // Neural nodes (small dots at intersections)
  const nodes = useMemo(() => {
    const items = [];
    for (let i = 0; i < 8; i++) {
      const x = 5 + Math.random() * 90;
      const y = 5 + Math.random() * 90;
      const size = 2 + Math.random() * 3;
      const alpha = 0.04 + Math.random() * 0.06;
      items.push(
        <div
          key={`node-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${size}px`,
            height: `${size}px`,
            background: `rgba(255, 255, 255, ${alpha})`,
            boxShadow: `0 0 ${size * 4}px rgba(255, 255, 255, ${alpha * 0.5})`,
            animation: `pulse-glow ${5 + Math.random() * 5}s ${Math.random() * 5}s infinite ease-in-out`,
          }}
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
      {lines}
      {nodes}
    </div>
  );
}
