import { CoverGraphic, Icon, MiniRoute, StatusPill } from "@/components/atlas";

// Prévia estática e cativante do Painel, na Home pública (deslogada). Sem
// backend: dados de exemplo embutidos. Reusa os primitivos de #1 — não
// duplica StatusPill/MiniRoute/Code. O protótipo torna a prévia clicável
// ("Ver exemplo"); aqui ela é puro visual e o gancho do overlay vem em #137.
export function HomePreview() {
  return (
    <div className="preview-frame home-preview">
      <div className="pf-bar">
        <i />
        <i />
        <i />
        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted)", marginLeft: 6 }}>
          traveltogether · painel
        </span>
        <span style={{ flex: 1 }} />
        <span className="chip" style={{ fontSize: 9 }}>
          prévia
        </span>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* mini próxima viagem */}
        <div className="card flat" style={{ border: "1px solid var(--line)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "84px 1fr" }}>
            <CoverGraphic seedText="Eurotrip" codeLabel="GRU" height="100%" />
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <StatusPill status="planning" />
                <span style={{ flex: 1 }} />
                <span className="mono-num" style={{ fontWeight: 700, fontSize: 15 }}>
                  72
                  <span className="mono" style={{ fontSize: 8, color: "var(--muted)" }}>
                    {" "}
                    dias
                  </span>
                </span>
              </div>
              <div className="display" style={{ fontSize: 17, fontWeight: 800 }}>
                Eurotrip
              </div>
              <div style={{ marginTop: 8 }}>
                <MiniRoute codes={["GRU", "LIS", "CDG", "FCO", "GRU"]} />
              </div>
            </div>
          </div>
        </div>

        {/* o que precisa de mim */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="mono" style={{ fontSize: 9, color: "var(--accent)", fontWeight: 600 }}>
            o que precisa de mim
          </span>
          <div className="alert warn" style={{ padding: "10px 12px" }}>
            <span className="ico">
              <Icon name="compass" size={15} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="ttl" style={{ display: "block", fontSize: 12.5 }}>
                Marcar a Escolhida em LIS → CDG
              </span>
              <span className="sub" style={{ display: "block", fontSize: 11 }}>
                2 Pesquisas de Passagem registradas
              </span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              className="card flat"
              style={{ border: "1px solid var(--line)", padding: "10px 12px", flex: 1 }}
            >
              <div className="mono-num" style={{ fontWeight: 700, fontSize: 15 }}>
                2/4
              </div>
              <div style={{ fontSize: 10.5, color: "var(--muted)" }}>trajetos decididos</div>
            </div>
            <div
              className="card flat"
              style={{ border: "1px solid var(--line)", padding: "10px 12px", flex: 1 }}
            >
              <div className="mono-num" style={{ fontWeight: 700, fontSize: 15 }}>
                R$ 4.200
              </div>
              <div style={{ fontSize: 10.5, color: "var(--muted)" }}>estimado / pessoa</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
