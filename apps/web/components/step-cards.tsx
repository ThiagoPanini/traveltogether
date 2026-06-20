import { steps } from "@/lib/landing/content";

export function StepCards() {
  return (
    <ol
      style={{
        listStyle: "none",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        border: "var(--border-hairline) solid var(--line)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      {steps.map((step, index) => (
        <li
          key={step.number}
          style={{
            padding: "28px 24px",
            display: "grid",
            gap: 12,
            borderLeft: index === 0 ? "none" : "var(--border-hairline) solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 0.9,
                color: "var(--accent)",
              }}
            >
              {step.number}
            </span>
            <span
              aria-hidden="true"
              className="mono"
              style={{ fontSize: 18, color: "var(--text-faint)" }}
            >
              {step.glyph}
            </span>
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--text-bright)",
            }}
          >
            {step.title}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.5 }}>{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
