import { Fragment } from "react";
import { Reveal } from "@/components/reveal";
import {
  type CrewChoice,
  layerDecisao,
  layerMarca,
  layerParadas,
  layerRotas,
  layerTrajeto,
  type ParadaNode,
  type RouteOption,
  wordmark,
} from "@/lib/landing/content";
import pulseStyles from "./pulse.module.css";

/**
 * Camadas de scroll: continuação nativa abaixo da dobra. Revela, conforme o
 * usuário desce, o modelo de domínio por baixo do herói —
 * Parada → Trajeto → Rota → decisão por-pessoa → marca. Cada camada herda o
 * Tema B Noturno e os invariantes de CONTEXT.md. O movimento (reveal) vive em
 * <Reveal>; reduced-motion é tratado lá e no módulo da estrela.
 */
export function ScrollLayers() {
  const layers = [
    { key: "paradas", node: <ParadasLayer /> },
    { key: "trajeto", node: <TrajetoLayer /> },
    { key: "rotas", node: <RotasLayer /> },
    { key: "decisao", node: <DecisaoLayer /> },
    { key: "marca", node: <MarcaLayer /> },
  ];
  return (
    <div
      style={{
        maxWidth: "var(--max-width-wide)",
        margin: "0 auto",
        padding: "0 var(--page-gutter)",
        display: "grid",
      }}
    >
      {layers.map((layer) => (
        // Mantém o respiro de 128px entre camadas (64 acima + linha + 64 abaixo),
        // mas marca a transição com uma hairline igual à do header — encurta a
        // sensação de vazio sem encurtar o espaçamento.
        <div key={layer.key} style={layerDivider}>
          {layer.node}
        </div>
      ))}
    </div>
  );
}

// Divisória sutil entre seções/camadas: linha centrada no respiro existente.
const layerDivider: React.CSSProperties = {
  marginTop: 64,
  paddingTop: 64,
  borderTop: "var(--border-hairline) solid var(--line)",
};

// ── 01 · O esqueleto — as Paradas ────────────────────────────────────────────
function ParadasLayer() {
  return (
    <section>
      <SectionHead {...layerParadas} />
      <Reveal
        duration={0.8}
        delay={0.1}
        distance={24}
        style={{
          background: "var(--surface)",
          border: "var(--border-hairline) solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: "36px 30px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px 16px",
        }}
      >
        {layerParadas.nodes.map((node, index) => (
          <Fragment key={node.city}>
            {index > 0 && (
              <span
                aria-hidden="true"
                className="mono"
                style={{ color: "var(--line-faint)", fontSize: 15, letterSpacing: 0 }}
              >
                →
              </span>
            )}
            <div style={{ display: "grid", gap: 6, textAlign: "center", minWidth: 84 }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(20px, 2.6vw, 28px)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: paradaCity[node.tone],
                }}
              >
                {node.city}
              </span>
              <span
                className="mono"
                style={{ fontSize: 9, letterSpacing: "0.14em", color: paradaRole[node.tone] }}
              >
                {node.role}
              </span>
            </div>
          </Fragment>
        ))}
      </Reveal>
    </section>
  );
}

// ── 02 · O que ligar — o Trajeto ─────────────────────────────────────────────
function TrajetoLayer() {
  return (
    <section>
      <SectionHead {...layerTrajeto} />
      <Reveal
        duration={0.8}
        delay={0.1}
        distance={24}
        style={{
          background: "var(--surface)",
          border: "var(--border-hairline) solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(18px, 5vw, 64px)" }}>
          <span style={endpointCity}>{layerTrajeto.from}</span>
          <span style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span
              aria-hidden="true"
              style={{ ...trajetoDash, width: "clamp(40px, 12vw, 120px)" }}
            />
            <span aria-hidden="true" style={{ color: "var(--accent)", fontSize: 18 }}>
              ✈
            </span>
            <span
              aria-hidden="true"
              style={{ ...trajetoDash, width: "clamp(40px, 12vw, 120px)" }}
            />
          </span>
          <span style={endpointCity}>{layerTrajeto.to}</span>
        </div>
        <span
          className="mono"
          style={{ letterSpacing: "0.16em", fontSize: 11, color: "var(--text-faint)" }}
        >
          {layerTrajeto.note}
        </span>
      </Reveal>
    </section>
  );
}

// ── 03 · As opções — as Rotas (aqui surgem os aeroportos) ────────────────────
function RotasLayer() {
  return (
    <section>
      <SectionHead {...layerRotas} bodyMaxWidth={580} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {layerRotas.options.map((option, index) => (
          <Reveal
            key={option.name}
            duration={0.8}
            delay={index * 0.1}
            distance={24}
            style={{
              background: "var(--surface)",
              border: "var(--border-hairline) solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: "28px 26px",
              display: "grid",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-bright)",
                }}
              >
                {option.name}
              </span>
              <span className="mono" style={pill(option.tone)}>
                {option.badge}
              </span>
            </div>
            <HopRow hops={option.hops} />
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>{option.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function HopRow({ hops }: { hops: RouteOption["hops"] }) {
  const direct = hops.length === 2;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: direct ? 14 : 10,
        flexWrap: direct ? "nowrap" : "wrap",
      }}
    >
      {hops.map((hop, index) => {
        const endpoint = index === 0 || index === hops.length - 1;
        return (
          <Fragment key={hop}>
            {index > 0 &&
              (direct ? (
                <>
                  <span aria-hidden="true" style={hopDash} />
                  <span aria-hidden="true" style={{ color: "var(--accent)" }}>
                    ✈
                  </span>
                  <span aria-hidden="true" style={hopDash} />
                </>
              ) : (
                <span aria-hidden="true" style={{ ...hopDash, minWidth: 18 }} />
              ))}
            <span className="mono" style={endpoint ? hopCode : hopCodeMuted}>
              {hop}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

// ── 04 · A decisão — Preferida pessoal, sem voto de grupo ────────────────────
function DecisaoLayer() {
  const { crew } = layerDecisao;
  return (
    <section>
      <SectionHead {...layerDecisao} bodyMaxWidth={580} marginBottom={36} />
      <Reveal
        duration={0.8}
        delay={0.1}
        distance={24}
        style={{
          background: "var(--surface)",
          border: "var(--border-hairline) solid var(--line)",
          borderLeft: "var(--border-accent-edge) solid var(--accent)",
          borderRadius: "var(--radius-card)",
          padding: "8px 24px 16px",
        }}
      >
        <div
          style={{
            padding: "16px 0 8px",
            borderBottom: "var(--border-hairline) solid var(--line)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--text-bright)",
            }}
          >
            {layerDecisao.trajetoLabel}
          </span>
        </div>
        {crew.map((member, index) => (
          <div
            key={member.initial}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: index === crew.length - 1 ? "13px 0 6px" : "13px 0",
              borderBottom:
                index === crew.length - 1 ? "none" : "var(--border-hairline) solid var(--line)",
            }}
          >
            <span aria-hidden="true" style={avatar}>
              {member.initial}
            </span>
            <span style={{ flex: 1, display: "grid", gap: 2, minWidth: 0 }}>
              <span style={{ color: "var(--text-body)", fontSize: 15, fontWeight: 500 }}>
                {member.name}
              </span>
              <span
                className="mono"
                style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--text-faint)" }}
              >
                {member.role}
              </span>
            </span>
            <span className="mono" style={pill(member.tone)}>
              {member.status}
            </span>
          </div>
        ))}
      </Reveal>
      <Reveal duration={0.7} delay={0.15} distance={18} style={{ marginTop: 18 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-faint)", textAlign: "center" }}>
          {layerDecisao.footnote}
        </p>
      </Reveal>
    </section>
  );
}

// ── 05 · A marca — fecho e conversão ─────────────────────────────────────────
function MarcaLayer() {
  return (
    <section>
      <Reveal
        duration={0.8}
        distance={26}
        style={{
          textAlign: "center",
          display: "grid",
          justifyItems: "center",
          gap: 26,
          padding: "30px 0 10px",
        }}
      >
        <span
          aria-hidden="true"
          className={pulseStyles.pulse}
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-circle)",
            border: "var(--border-outline) solid var(--accent)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            fontSize: 28,
          }}
        >
          ✦
        </span>
        <h2 style={{ fontSize: "clamp(32px, 6vw, 58px)", lineHeight: 0.92, margin: 0 }}>
          {layerMarca.title.map((line, index) => (
            <Fragment key={line}>
              {index > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </h2>
        <p style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 520, margin: 0 }}>
          {layerMarca.body}
        </p>
        {/* Wordmark do fecho: proporção própria do protótipo (anel 33 · texto 30),
            estrela estática — distinta do <Wordmark> de topo/rodapé. */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <span
            aria-hidden="true"
            style={{
              width: 33,
              height: 33,
              borderRadius: "var(--radius-circle)",
              border: "var(--border-outline) solid var(--accent)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              fontSize: 15,
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
              fontSize: 30,
              color: "var(--text-bright)",
            }}
          >
            {wordmark}
          </span>
        </span>
        <a
          href="#como-funciona"
          style={{
            marginTop: 8,
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
            fontSize: 15,
            padding: "13px 30px",
            borderRadius: "var(--radius-btn)",
          }}
        >
          {layerMarca.cta}
        </a>
      </Reveal>
    </section>
  );
}

// ── Cabeçalho de camada (sobrescrito + h2 + corpo) ───────────────────────────
function SectionHead({
  eyebrow,
  title,
  body,
  bodyMaxWidth = 560,
  marginBottom = 42,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bodyMaxWidth?: number;
  marginBottom?: number;
}) {
  return (
    <Reveal duration={0.7} distance={22} style={{ marginBottom }}>
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
        {eyebrow}
      </span>
      <h2 style={{ fontSize: "clamp(30px, 5vw, 48px)", margin: "0 0 12px" }}>{title}</h2>
      <p style={{ fontSize: 16, color: "var(--text-muted)", maxWidth: bodyMaxWidth, margin: 0 }}>
        {body}
      </p>
    </Reveal>
  );
}

// ── Estilos compartilhados ───────────────────────────────────────────────────
const paradaCity: Record<ParadaNode["tone"], string> = {
  origem: "var(--text-muted)",
  stop: "var(--text-bright)",
  destino: "var(--accent)",
};

const paradaRole: Record<ParadaNode["tone"], string> = {
  origem: "var(--text-faintest)",
  stop: "var(--text-faint)",
  destino: "var(--accent)",
};

const endpointCity: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(28px, 4.5vw, 46px)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "var(--text-bright)",
};

const trajetoDash: React.CSSProperties = {
  height: 0,
  borderTop: "var(--border-outline) dashed var(--accent)",
};

const hopDash: React.CSSProperties = {
  flex: 1,
  height: 0,
  borderTop: "var(--border-outline) dashed var(--accent)",
};

const hopCode: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "0.06em",
  color: "var(--text-bright)",
};

const hopCodeMuted: React.CSSProperties = {
  fontSize: 18,
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
};

const avatar: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "var(--radius-circle)",
  border: "var(--border-outline) solid var(--line-strong)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: 16,
  color: "var(--text-body)",
  flex: "0 0 auto",
};

// Pílula de status/contagem: cor por tom, sempre com borda real (não só cor).
const pillTone: Record<CrewChoice["tone"] | RouteOption["tone"], { fg: string; border: string }> = {
  success: { fg: "var(--success)", border: "var(--success-border)" },
  warning: { fg: "var(--warning)", border: "var(--warning-border)" },
  accent: { fg: "var(--accent)", border: "var(--accent-border)" },
  muted: { fg: "var(--text-faint)", border: "var(--line-muted)" },
};

function pill(tone: CrewChoice["tone"] | RouteOption["tone"]): React.CSSProperties {
  return {
    fontSize: 10,
    letterSpacing: "0.1em",
    color: pillTone[tone].fg,
    border: `var(--border-hairline) solid ${pillTone[tone].border}`,
    borderRadius: "var(--radius-pill)",
    padding: "4px 10px",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  };
}
