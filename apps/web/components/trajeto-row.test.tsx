import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Trajeto } from "@/lib/trips/backbone";
import { TrajetoRow } from "./trajeto-row";

/** Linhas são `li`; renderiza dentro de uma `ol`. */
function row(trajeto: Trajeto) {
  return render(
    <ol>
      <TrajetoRow trajeto={trajeto} />
    </ol>,
  );
}

describe("TrajetoRow", () => {
  it("sua ida com proposta: rota, kicker, pílula 'proposto: {tipo}' e CTA em breve desabilitado", () => {
    row({
      kind: "ida",
      from: "São Paulo",
      to: "Nova York",
      transfer: { kind: "plane", other_text: null },
      date: "2026-07-02",
    });

    // rota no título: o leitor de tela lê "São Paulo para Nova York"; a seta é só visual
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent(/são paulo\s*para\s*→\s*nova york/i);
    // decorativos fora da árvore de acessibilidade (não mascarar a rota com a seta)
    expect(screen.getByText("→")).toHaveAttribute("aria-hidden", "true");
    expect(item.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
    // data formatada no eixo (caminho feliz; data presente → não escondida)
    const dateCell = screen.getByText("02 jul 2026");
    expect(dateCell).toBeInTheDocument();
    expect(dateCell).not.toHaveAttribute("aria-hidden");
    expect(screen.getByText("sua ida")).toBeInTheDocument();
    expect(screen.getByText("proposto: Avião")).toBeInTheDocument();
    const cta = screen.getByText(/pesquisa de translado · em breve/i);
    expect(cta).toHaveAttribute("aria-disabled", "true");
    expect(cta).not.toHaveAttribute("tabindex");
    // honesto: por-pessoa, sem voto/preço
    expect(screen.getByText(/cada pessoa ainda pesquisa e decide a sua/i)).toBeInTheDocument();
  });

  it("sua ida sem proposta: prompt por-pessoa (proponha), nunca o coletivo 'alinhem'", () => {
    row({ kind: "ida", from: "São Paulo", to: "Nova York", transfer: null, date: null });

    expect(screen.getByText("sua ida")).toBeInTheDocument();
    expect(screen.getByText("em discussão")).toBeInTheDocument();
    // ponta é por-pessoa (inv. 6): singular "proponha", não o "alinhem" do salto do grupo
    expect(screen.getByText(/proponha o meio da sua ida/i)).toBeInTheDocument();
    expect(screen.queryByText(/alinhem/i)).not.toBeInTheDocument();
    // data ausente → "—" decorativo
    expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
  });

  it("salto compartilhado em discussão: pílula warning e prompt de grupo (alinhem)", () => {
    row({
      kind: "shared",
      from: "Nova York",
      to: "Boston",
      transfer: { kind: "undecided", other_text: null },
      date: null,
    });

    expect(screen.getByText("translado compartilhado")).toBeInTheDocument();
    expect(screen.getByText("em discussão")).toBeInTheDocument();
    expect(screen.getByText(/alinhem o meio deste salto/i)).toBeInTheDocument();
  });

  it("volta-semente: muted 'emerge na pesquisa', sem card nem CTA", () => {
    row({ kind: "volta-seed", from: "Boston", to: "São Paulo", transfer: null, date: null });

    const item = screen.getByRole("listitem");
    expect(within(item).getByText("sua volta")).toBeInTheDocument();
    expect(within(item).getByText("emerge na pesquisa")).toBeInTheDocument();
    expect(within(item).getByText(/a volta emerge quando alguém pesquisar/i)).toBeInTheDocument();
    // a semente não oferece ação: sem CTA de pesquisa
    expect(within(item).queryByText(/em breve/i)).not.toBeInTheDocument();
  });
});
