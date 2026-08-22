"use client";

/** Animated three-dot indicator shown while the agent loop is running. */
export function StreamingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "8px 12px",
        alignItems: "center",
      }}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#6366f1",
            display: "inline-block",
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
