import { Fragment } from "react";
import { ribbon } from "@/lib/landing/content";

export function BoardingPassRibbon() {
  return (
    <section
      id="exemplo"
      aria-label={`Cartão de embarque — ${ribbon.label}`}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "var(--border-hairline) solid var(--line)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* entalhes laterais do cartão de embarque */}
      <span aria-hidden="true" style={notch("left")} />
      <span aria-hidden="true" style={notch("right")} />

      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "16px 24px",
          borderBottom: "var(--border-hairline) dashed var(--line-dashed)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--text-bright)",
          }}
        >
          {ribbon.label}
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
          {ribbon.meta}
        </span>
      </header>

      <ol
        style={{
          listStyle: "none",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          padding: "20px 24px",
        }}
      >
        {ribbon.legs.map((leg, index) => (
          <Fragment key={`${leg.code}-${index}`}>
            {index > 0 && (
              <li
                aria-hidden="true"
                className="mono"
                style={{ color: "var(--accent)", fontSize: 14 }}
              >
                →
              </li>
            )}
            <li style={{ display: "grid", gap: 2, textAlign: "center" }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "var(--text-bright)",
                }}
              >
                {leg.code}
              </span>
              <span className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>
                {leg.city}
              </span>
            </li>
          </Fragment>
        ))}
      </ol>
    </section>
  );
}

function notch(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: -9,
    transform: "translateY(-50%)",
    width: 18,
    height: 18,
    borderRadius: "var(--radius-circle)",
    background: "var(--bg-root)",
  };
}
