import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("Landing", () => {
  it("tem um único h1 com a headline do herói", () => {
    render(<HomePage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/organizando viagens de maneira fácil e rápida/i);
  });

  it("mostra o wordmark travel·manager (topo, marca e rodapé)", () => {
    render(<HomePage />);
    expect(screen.getAllByText("travel·manager").length).toBeGreaterThanOrEqual(2);
  });

  it("tem o botão Entrar e não as CTAs antigas do herói", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /entrar/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /criar viagem/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ver exemplo/i })).not.toBeInTheDocument();
  });

  it("apresenta o 'comece em três passos' com os três passos do protótipo", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Comece em três passos" })).toBeInTheDocument();
    for (const title of ["Crie uma conta", "Cadastre uma viagem", "Organize"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("não tem mais o boarding-pass ribbon (fora do protótipo)", () => {
    render(<HomePage />);
    expect(screen.queryByRole("region", { name: /cartão de embarque/i })).not.toBeInTheDocument();
  });

  it("não usa as palavras proibidas (whatsapp / caça)", () => {
    const { container } = render(<HomePage />);
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).not.toContain("whatsapp");
    expect(text.toLowerCase()).not.toContain("caça");
  });

  it("revela as camadas de scroll na ordem do modelo (paradas → trajeto → rotas → decisão)", () => {
    render(<HomePage />);
    for (const title of [
      "Toda viagem começa pelas paradas",
      "Entre as paradas, os trajetos",
      "Cada trajeto, mais de um caminho",
      "A decisão é de cada um",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("a camada de rotas compara direta (1 compra) e via Miami (2 compras)", () => {
    render(<HomePage />);
    expect(screen.getByText("Rota direta")).toBeInTheDocument();
    expect(screen.getByText("1 compra")).toBeInTheDocument();
    expect(screen.getByText("Via Miami")).toBeInTheDocument();
    expect(screen.getByText("2 compras")).toBeInTheDocument();
  });

  it("a decisão é por-pessoa, sem eleição de grupo", () => {
    const { container } = render(<HomePage />);
    // cada membro carrega o seu próprio status pessoal
    expect(screen.getByText("preferiu a direta")).toBeInTheDocument();
    expect(screen.getByText("prefere a via Miami")).toBeInTheDocument();
    expect(screen.getByText("sem preferida")).toBeInTheDocument();
    // invariante 4: nada de voto/eleição de grupo na cópia
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("eleição");
    expect(text).not.toContain("vencedora");
  });

  it("fecha com a CTA 'Criar uma conta' e o caption do rodapé", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /criar uma conta/i })).toBeInTheDocument();
    expect(screen.getByText("Organize a viagem com o grupo todo")).toBeInTheDocument();
  });
});
