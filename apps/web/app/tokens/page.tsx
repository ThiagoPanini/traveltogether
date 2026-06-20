import { colorTokens, typeScale } from "@/lib/design/tokens";

const familyVar: Record<string, string> = {
  display: "var(--font-display)",
  body: "var(--font-body)",
  mono: "var(--font-mono)",
};

export default function TokensPage() {
  return (
    <main
      style={{
        maxWidth: "var(--max-width-wide)",
        margin: "0 auto",
        padding: "var(--page-gutter)",
        display: "grid",
        gap: "40px",
      }}
    >
      <header>
        <h1>Tokens — Tema B Noturno</h1>
        <p className="mono">Paleta + escala tipográfica · referência viva</p>
      </header>

      <section aria-labelledby="palette-title" style={{ display: "grid", gap: "16px" }}>
        <h2 id="palette-title">Paleta</h2>
        <ul
          style={{
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          {colorTokens.map((token) => (
            <li
              key={token.cssVar}
              style={{
                border: "var(--border-hairline) solid var(--line)",
                borderRadius: "var(--radius-card)",
                overflow: "hidden",
                background: "var(--surface)",
              }}
            >
              <div style={{ height: 64, background: `var(${token.cssVar})` }} />
              <div style={{ padding: "8px 10px" }}>
                <div className="mono">{token.cssVar}</div>
                <div className="mono" style={{ color: "var(--text-faint)" }}>
                  {token.value}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type-title" style={{ display: "grid", gap: "16px" }}>
        <h2 id="type-title">Tipografia</h2>
        <ul style={{ listStyle: "none", display: "grid", gap: "12px" }}>
          {typeScale.map((step) => (
            <li
              key={step.role}
              style={{
                fontFamily: familyVar[step.family],
                fontSize: step.size,
                fontWeight: step.weight,
                textTransform: step.family === "body" ? "none" : "uppercase",
              }}
            >
              {step.role} · {step.size} · {step.weight}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
