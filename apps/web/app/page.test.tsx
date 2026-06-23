import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("Landing", () => {
  it("tem um único h1 com a headline de três passos", () => {
    render(<HomePage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/cadastrem a viagem/i);
    expect(h1s[0]).toHaveTextContent(/desenhem as paradas/i);
    expect(h1s[0]).toHaveTextContent(/pesquisem o translado/i);
  });

  it("mostra o wordmark travel·manager", () => {
    render(<HomePage />);
    expect(screen.getAllByText("travel·manager").length).toBeGreaterThanOrEqual(1);
  });

  it("apresenta os três step cards", () => {
    render(<HomePage />);
    for (const title of ["Cadastrem", "Desenhem", "Pesquisem"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("renderiza o boarding-pass ribbon ida e volta (GRU → JFK → MIA → MCO → GRU)", () => {
    render(<HomePage />);
    const ribbon = screen.getByRole("region", { name: /cartão de embarque/i });
    for (const code of ["JFK", "MIA", "MCO"]) {
      expect(within(ribbon).getByText(code)).toBeInTheDocument();
    }
    // round-trip: GRU aparece na ponta de ida e na de volta
    expect(within(ribbon).getAllByText("GRU")).toHaveLength(2);
  });

  it("tem as CTAs Criar viagem e Ver exemplo", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /criar viagem/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver exemplo/i })).toBeInTheDocument();
  });

  it("não usa as palavras proibidas (whatsapp / caça)", () => {
    const { container } = render(<HomePage />);
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).not.toContain("whatsapp");
    expect(text.toLowerCase()).not.toContain("caça");
  });
});
