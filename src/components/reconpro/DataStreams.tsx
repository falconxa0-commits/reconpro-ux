"use client";

import { useState, useEffect } from "react";

interface Stream {
  id: number;
  x: number;
  speed: number;
  delay: number;
  length: number;
  alpha: number;
}

function generateStreams() {
  const streams: Stream[] = [];
  for (let i = 0; i < 15; i++) {
    streams.push({
      id: i,
      x: Math.random() * 100,
      speed: 6 + Math.random() * 12,
      delay: Math.random() * 15,
      length: 30 + Math.random() * 80,
      alpha: 0.02 + Math.random() * 0.04,
    });
  }
  return streams;
}

export function DataStreams() {
  const [streams, setStreams] = useState<Stream[] | null>(null);

  useEffect(() => {
    setStreams(generateStreams());
  }, []);

  if (!streams) {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true" />
    );
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {streams.map((s) => (
        <div
          key={s.id}
          className="data-stream-line"
          style={{
            left: `${s.x}%`,
            "--stream-length": `${s.length}px`,
            "--stream-speed": `${s.speed}s`,
            "--stream-delay": `${s.delay}s`,
            "--stream-alpha": String(s.alpha),
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
