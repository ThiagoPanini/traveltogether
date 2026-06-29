import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("Landing", () => {
  it("tem um único h1 com a headline do redesign", () => {
    render(<HomePage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/o translado da viagem,\s*decidido juntos/i);
  });

  it("mostra navegação principal e CTAs do herói", () => {
    render(<HomePage />);
    expect(screen.getAllByText("travel·manager").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/entrar");
    expect(screen.getByRole("link", { name: /criar viagem/i })).toHaveAttribute("href", "/entrar");
    expect(screen.getByRole("link", { name: /ver exemplo/i })).toHaveAttribute(
      "href",
      "/app/viagens/orlando",
    );
  });

  it("apresenta o modelo em três passos do protótipo", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /o modelo, em três passos/i })).toBeInTheDocument();
    for (const title of ["Tracem as Paradas", "Pesquisem o translado", "Marquem a Preferida"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("usa o motivo de rota São Paulo → Orlando como âncora visual", () => {
    render(<HomePage />);
    const route = screen.getByRole("complementary", { name: /rota de exemplo/i });
    for (const city of ["São Paulo", "Nova York", "Miami", "Orlando"]) {
      expect(route).toHaveTextContent(city);
    }
    expect(route).toHaveTextContent(/4 cidades · 3 trajetos/i);
  });

  it("mostra decisão por pessoa, sem eleição de grupo", () => {
    const { container } = render(<HomePage />);
    expect(screen.getByText("Preferiu a direta")).toBeInTheDocument();
    expect(screen.getByText("Prefere via Miami")).toBeInTheDocument();
    expect(screen.getByText("Sem preferida")).toBeInTheDocument();
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("eleição");
    expect(text).not.toContain("vencedora");
  });

  it("não usa as palavras proibidas", () => {
    const { container } = render(<HomePage />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).not.toContain("whatsapp");
    expect(text).not.toContain("caça");
  });
});
