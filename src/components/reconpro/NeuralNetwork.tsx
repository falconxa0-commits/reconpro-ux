"use client";

import { useState, useEffect } from "react";

interface NeuralLine {
  id: number;
  y: number;
  x: number;
  width: number;
  speed: number;
  delay: number;
  alpha: number;
  rotation: number;
}

interface NeuralNode {
  id: number;
  x: number;
  y: number;
  size: number;
  alpha: number;
  pulseDuration: number;
  pulseDelay: number;
}

function generateData() {
  const lines: NeuralLine[] = [];
  for (let i = 0; i < 12; i++) {
    lines.push({
      id: i,
      y: 10 + Math.random() * 80,
      x: Math.random() * 100,
      width: 100 + Math.random() * 400,
      speed: 4 + Math.random() * 8,
      delay: Math.random() * 10,
      alpha: 0.015 + Math.random() * 0.035,
      rotation: -15 + Math.random() * 30,
    });
  }
  const nodes: NeuralNode[] = [];
  for (let i = 0; i < 8; i++) {
    nodes.push({
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      size: 2 + Math.random() * 3,
      alpha: 0.04 + Math.random() * 0.06,
      pulseDuration: 5 + Math.random() * 5,
      pulseDelay: Math.random() * 5,
    });
  }
  return { lines, nodes };
}

export function NeuralNetwork() {
  const [data, setData] = useState<ReturnType<typeof generateData> | null>(null);

  useEffect(() => {
    setData(generateData());
  }, []);

  if (!data) {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true" />
    );
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {data.lines.map((line) => (
        <div
          key={line.id}
          className="neural-line"
          style={{
            top: `${line.y}%`,
            left: `${line.x}%`,
            width: `${line.width}px`,
            "--neural-speed": `${line.speed}s`,
            "--neural-delay": `${line.delay}s`,
            "--neural-alpha": String(line.alpha),
            transform: `rotate(${line.rotation}deg)`,
          } as React.CSSProperties}
        />
      ))}
      {data.nodes.map((node) => (
        <div
          key={`node-${node.id}`}
          className="absolute rounded-full"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: `${node.size}px`,
            height: `${node.size}px`,
            background: `rgba(255, 255, 255, ${node.alpha})`,
            boxShadow: `0 0 ${node.size * 4}px rgba(255, 255, 255, ${node.alpha * 0.5})`,
            animation: `neural-node-pulse ${node.pulseDuration}s ${node.pulseDelay}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}
