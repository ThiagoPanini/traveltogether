import Link from "next/link";

import { Icon } from "@/components/atlas";
import { HomePreview } from "@/components/home-preview";
import { PublicTopBar } from "@/components/public-top-bar";
import { CTA_BAND, FOOTER_NOTE, HERO, HOME_FEATURES, SECTION_FEATS } from "@/lib/home/content";

// Home pública (#136), à paridade do protótipo (HomeScreen): hero, 6 feature
// cards, HomePreview, banda de CTA e copy de acesso aberto (ADR-0013). Toda a
// copy mora em lib/home/content (testada). Componente server: o gancho do
// botão "Ver exemplo" (DemoOverlay) chega em #137 — aqui ele é inerte.
export default function Home() {
  return (
    <div className="public-home">
      <PublicTopBar />

      <div className="page fadeup">
        <div className="shell">
          {/* hero */}
          <div className="home-hero">
            <div style={{ maxWidth: 540 }}>
              <div
                className="mono"
                style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 18 }}
              >
                {HERO.kicker}
              </div>
              <h1 className="display" style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>
                {HERO.headline}
              </h1>
              <p
                className="soft"
                style={{ fontSize: 18, maxWidth: 480, marginTop: 22, textWrap: "pretty" }}
              >
                {HERO.sub}
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
                <Link className="btn accent" href="/login">
                  {HERO.primaryCta} <Icon name="arrowRight" size={15} />
                </Link>
                {/* #137: este botão abre o DemoOverlay; por ora é inerte. */}
                <button className="btn ghost" type="button">
                  <Icon name="eye" size={15} /> {HERO.demoCta}
                </button>
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 18 }}>
                {HERO.finePrint}
              </div>
            </div>

            <HomePreview />
          </div>

          {/* o que você organiza aqui */}
          <div style={{ marginTop: 84 }}>
            <div className="section-head" style={{ marginBottom: 22 }}>
              <span className="kicker">{SECTION_FEATS.kicker}</span>
              <h2 style={{ fontSize: 20 }}>{SECTION_FEATS.heading}</h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {HOME_FEATURES.map((f) => (
                <div key={f.title} className="feat">
                  <div className="feat-ico">
                    <Icon name={f.icon} size={18} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 7 }}>{f.title}</h3>
                  <p className="soft" style={{ fontSize: 14, textWrap: "pretty" }}>
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* banda de fechamento */}
          <div
            className="card"
            style={{
              marginTop: 64,
              padding: "40px 36px",
              display: "flex",
              alignItems: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 360px" }}>
              <h2 className="display" style={{ fontSize: 30, marginBottom: 8 }}>
                {CTA_BAND.heading}
              </h2>
              <p className="soft" style={{ fontSize: 15, maxWidth: 520 }}>
                {CTA_BAND.body}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="btn accent" href="/login">
                {CTA_BAND.primaryCta} <Icon name="arrowRight" size={15} />
              </Link>
              {/* #137: idem ao hero — abre o DemoOverlay. */}
              <button className="btn ghost" type="button">
                <Icon name="eye" size={15} /> {CTA_BAND.demoCta}
              </button>
            </div>
          </div>

          {/* rodapé — acesso aberto */}
          <div
            style={{
              marginTop: 48,
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "var(--muted)",
            }}
          >
            <hr className="hairline" style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 10 }}>
              {FOOTER_NOTE}
            </span>
            <hr className="hairline" style={{ flex: 1 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
