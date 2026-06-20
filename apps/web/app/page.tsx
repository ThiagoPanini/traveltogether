import { BoardingPassRibbon } from "@/components/boarding-pass-ribbon";
import { StepCards } from "@/components/step-cards";
import { Wordmark } from "@/components/wordmark";
import { cta, heroHeadline, heroSubtitle, tagline } from "@/lib/landing/content";

export default function HomePage() {
  return (
    <div
      style={{
        maxWidth: "var(--max-width-wide)",
        margin: "0 auto",
        padding: "var(--page-gutter)",
        display: "grid",
        gap: 72,
      }}
    >
      <header
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
      >
        <Wordmark />
        <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
          {tagline}
        </span>
      </header>

      <section
        style={{
          maxWidth: "var(--hero-max)",
          display: "grid",
          gap: 24,
        }}
      >
        <h1 style={{ fontSize: "clamp(40px, 8vw, 74px)", lineHeight: 0.92 }}>
          {heroHeadline.map((line) => (
            <span key={line} style={{ display: "block" }}>
              {line}
            </span>
          ))}
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--text-muted)" }}>{heroSubtitle}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a href="#como-funciona" style={primaryCta}>
            {cta.primary}
          </a>
          <a href="#exemplo" style={ghostCta}>
            {cta.secondary} →
          </a>
        </div>
      </section>

      <section id="como-funciona" style={{ display: "grid", gap: 20 }}>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 42px)" }}>Como funciona</h2>
        <StepCards />
      </section>

      <section style={{ display: "grid", gap: 20 }}>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 42px)" }}>Um exemplo de bordo</h2>
        <BoardingPassRibbon />
      </section>

      <footer
        style={{
          borderTop: "var(--border-hairline) solid var(--line)",
          paddingTop: 24,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Wordmark size={14} />
        <span className="mono" style={{ fontSize: 9, color: "var(--text-faintest)" }}>
          Decidam o translado juntos
        </span>
      </footer>
    </div>
  );
}

const primaryCta: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--on-accent)",
  fontFamily: "var(--font-display)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontWeight: 700,
  fontSize: 15,
  padding: "12px 22px",
  borderRadius: "var(--radius-btn)",
};

const ghostCta: React.CSSProperties = {
  border: "var(--border-outline) solid var(--line-strong)",
  color: "var(--text-body)",
  fontFamily: "var(--font-display)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontWeight: 600,
  fontSize: 15,
  padding: "12px 22px",
  borderRadius: "var(--radius-btn)",
};
