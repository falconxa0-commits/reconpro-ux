"use client";

export function AuroraBackground() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Primary aurora layer */}
      <div
        className="aurora-layer"
        style={{
          "--aurora-duration": "35s",
          "--aurora-delay": "0s",
          top: "10%",
        } as React.CSSProperties}
      />
      {/* Secondary aurora layer — offset timing */}
      <div
        className="aurora-layer"
        style={{
          "--aurora-duration": "45s",
          "--aurora-delay": "-15s",
          top: "40%",
          opacity: 0.5,
        } as React.CSSProperties}
      />
      {/* Third aurora layer — subtle depth */}
      <div
        className="aurora-layer"
        style={{
          "--aurora-duration": "55s",
          "--aurora-delay": "-25s",
          top: "70%",
          opacity: 0.3,
        } as React.CSSProperties}
      />
    </div>
  );
}
