import { wordmark } from "@/lib/landing/content";

export function Wordmark({ size = 18 }: { size?: number }) {
  const ring = Math.round(size * 1.5);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span
        aria-hidden="true"
        style={{
          width: ring,
          height: ring,
          borderRadius: "var(--radius-circle)",
          border: "var(--border-outline) solid var(--accent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent)",
          fontSize: Math.round(size * 0.7),
        }}
      >
        ✦
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 700,
          fontSize: size,
          color: "var(--text-bright)",
        }}
      >
        {wordmark}
      </span>
    </span>
  );
}
