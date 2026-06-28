import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Trajeto } from "@/lib/trips/backbone";
import { FareResearchWizard } from "./fare-research-wizard";

const flight: Trajeto = {
  kind: "ida",
  from: "São Paulo",
  to: "Nova York",
  transfer: { kind: "plane", other_text: null },
  date: "2026-09-14",
};

afterEach(() => {
  document.body.style.overflow = "";
});

describe("FareResearchWizard", () => {
  it("registra uma Pesquisa aérea ida-e-volta com dinheiro e pontos sem duplicar o preço", () => {
    const onSave = vi.fn();
    render(<FareResearchWizard trajeto={flight} onClose={vi.fn()} onSave={onSave} />);

    expect(screen.getByRole("dialog", { name: /nova pesquisa/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /avião/i })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /ida e volta/i }));
    expect(screen.getByText(/2 Trechos · 1 item/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(screen.getByLabelText(/empresa ou plataforma/i), {
      target: { value: "LATAM" },
    });
    fireEvent.change(screen.getByLabelText("Aeroporto de saída 1"), {
      target: { value: "GRU" },
    });
    fireEvent.change(screen.getByLabelText("Aeroporto de chegada 1"), {
      target: { value: "JFK" },
    });
    fireEvent.change(screen.getByLabelText("Aeroporto de saída 2"), {
      target: { value: "JFK" },
    });
    fireEvent.change(screen.getByLabelText("Aeroporto de chegada 2"), {
      target: { value: "GRU" },
    });
    const dates = screen.getAllByLabelText(/data de saída/i);
    fireEvent.change(dates[0], { target: { value: "2026-09-14" } });
    fireEvent.change(dates[1], { target: { value: "2026-09-28" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(screen.getByLabelText(/valor do item inteiro/i), {
      target: { value: "3420,50" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /pontos/i }));
    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: "75000" } });
    fireEvent.change(screen.getByLabelText(/programa de fidelidade/i), {
      target: { value: "LATAM Pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByRole("heading", { name: /pronta para compartilhar/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /registrar pesquisa/i }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({
      transferKind: "plane",
      includeReturn: true,
      moneyAmount: "3420,50",
      pointsAmount: "75000",
      loyaltyProgram: "LATAM Pass",
    });
    expect(onSave.mock.calls[0][0].segments).toHaveLength(2);
  });

  it("adapta a ficha terrestre sem IATA, escala ou programa de fidelidade", () => {
    const train: Trajeto = {
      kind: "shared",
      from: "Paris",
      to: "Londres",
      transfer: { kind: "train", other_text: null },
      date: null,
    };
    render(<FareResearchWizard trajeto={train} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByRole("button", { name: /trem/i })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.queryByText(/aeroporto de saída/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/escalas no bilhete/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/empresa ou plataforma/i), {
      target: { value: "Eurostar" },
    });
    fireEvent.change(screen.getByLabelText(/data de saída/i), {
      target: { value: "2026-10-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.queryByRole("checkbox", { name: /pontos/i })).not.toBeInTheDocument();
    expect(screen.getByText(/dinheiro e pontos são dimensões separadas/i)).toBeInTheDocument();
  });

  it("mantém o usuário no passo e explica campos obrigatórios", () => {
    render(<FareResearchWizard trajeto={flight} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/informe a empresa ou plataforma/i);
    expect(screen.getByRole("heading", { name: /dê contorno à pesquisa/i })).toBeInTheDocument();
  });
});
