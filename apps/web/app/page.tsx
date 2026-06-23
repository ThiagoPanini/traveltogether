import pulseStyles from "@/components/pulse.module.css";
import { Reveal } from "@/components/reveal";
import { ScrollLayers } from "@/components/scroll-layers";
import { StepCards } from "@/components/step-cards";
import { Wordmark } from "@/components/wordmark";
import {
  comoFunciona,
  footer,
  heroEyebrow,
  heroHeadline,
  heroSubtitle,
  nav,
} from "@/lib/landing/content";
import pageStyles from "./page.module.css";

export default function HomePage() {
  return (
    <>
      {/* ── Topo: navegação, herói e "como funciona" ── */}
      <div style={shell}>
        <Reveal
          as="header"
          duration={0.6}
          distance={18}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "28px 0 26px",
            borderBottom: "var(--border-hairline) solid var(--line)",
          }}
        >
          <Wordmark pulse />
          <a href="#como-funciona" className={pageStyles.entrar}>
            {nav.entrar}
          </a>
        </Reveal>

        <section style={{ maxWidth: "var(--hero-max)", padding: "56px 0 48px" }}>
          <Reveal
            as="span"
            className="mono"
            duration={0.6}
            distance={18}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              letterSpacing: "0.16em",
              fontSize: 11,
              color: "var(--text-faint)",
              marginBottom: 26,
            }}
          >
            <span
              aria-hidden="true"
              className={pulseStyles.pulse}
              style={{ color: "var(--accent)" }}
            >
              ✦
            </span>{" "}
            {heroEyebrow}
          </Reveal>
          <Reveal
            as="h1"
            duration={0.7}
            delay={0.08}
            style={{
              fontSize: "clamp(42px, 8vw, 76px)",
              lineHeight: 0.92,
              letterSpacing: "0.03em",
              margin: 0,
            }}
          >
            {heroHeadline.map((segment) => (
              <span
                key={segment.text}
                style={segment.accent ? { color: "var(--accent)" } : undefined}
              >
                {segment.text}
              </span>
            ))}
          </Reveal>
          <Reveal
            as="p"
            duration={0.7}
            delay={0.18}
            style={{
              maxWidth: 620,
              margin: "30px 0 0",
              fontSize: 17,
              lineHeight: 1.55,
              color: "var(--text-muted)",
            }}
          >
            {heroSubtitle}
          </Reveal>
        </section>

        <section
          id="como-funciona"
          style={{
            padding: "48px 0 40px",
            borderTop: "var(--border-hairline) solid var(--line)",
          }}
        >
          <Reveal duration={0.6} distance={20} style={{ marginBottom: 30 }}>
            <span
              className="mono"
              style={{
                display: "block",
                fontSize: 11,
                letterSpacing: "0.16em",
                color: "var(--accent)",
                marginBottom: 14,
              }}
            >
              {comoFunciona.eyebrow}
            </span>
            <h2 style={{ fontSize: "clamp(30px, 5vw, 44px)", margin: "0 0 10px" }}>
              {comoFunciona.title}
            </h2>
            <p style={{ fontSize: 16, color: "var(--text-muted)", margin: 0 }}>
              {comoFunciona.intro}
            </p>
          </Reveal>
          <Reveal duration={0.7} distance={24}>
            <StepCards />
          </Reveal>
        </section>
      </div>

      {/* ── Camadas: o modelo de domínio revelado abaixo da dobra ── */}
      <ScrollLayers />

      {/* ── Rodapé ── */}
      <div style={shell}>
        <footer
          style={{
            borderTop: "var(--border-hairline) solid var(--line)",
            marginTop: 40,
            padding: "26px 0 120px",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Wordmark size={14} />
          <span
            className="mono"
            style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--text-faintest)" }}
          >
            {footer.caption}
          </span>
        </footer>
      </div>
    </>
  );
}

// Faixa centralizada do topo e do rodapé (a área das camadas tem a sua própria).
const shell: React.CSSProperties = {
  maxWidth: "var(--max-width-wide)",
  margin: "0 auto",
  padding: "0 var(--page-gutter)",
};
