"use client";

import { useMemo } from "react";

export function DataStreams() {
  const streams = useMemo(() => {
    const items = [];
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 100;
      const speed = 6 + Math.random() * 12;
      const delay = Math.random() * 15;
      const length = 30 + Math.random() * 80;
      const alpha = 0.02 + Math.random() * 0.04;
      items.push(
        <div
          key={i}
          className="data-stream-line"
          style={{
            left: `${x}%`,
            "--stream-length": `${length}px`,
            "--stream-speed": `${speed}s`,
            "--stream-delay": `${delay}s`,
            "--stream-alpha": String(alpha),
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
      {streams}
    </div>
  );
}
