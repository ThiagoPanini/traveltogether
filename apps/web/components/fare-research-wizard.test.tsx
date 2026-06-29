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
  it("registra uma pesquisa ida-e-volta com dinheiro e pontos", () => {
    const onSave = vi.fn();
    render(
      <FareResearchWizard
        tripName="Costa Leste"
        trajeto={flight}
        trajectoryIndex={1}
        trajectoryTotal={3}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("dialog", { name: /pesquisar translado/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /avião/i })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /ida e volta/i }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "3420,50" } });
    fireEvent.click(screen.getByRole("button", { name: /pontos/i }));
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "75000" } });
    fireEvent.click(screen.getByRole("button", { name: /registrar pesquisa/i }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({
      transferKind: "plane",
      includeReturn: true,
      moneyAmount: "3420,50",
      pointsAmount: "75000",
      loyaltyProgram: "Pontos",
      provider: "Pesquisa pessoal",
    });
    expect(onSave.mock.calls[0][0].segments).toHaveLength(2);
  });

  it("mostra pontos também para translado terrestre", () => {
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

    expect(screen.getByText(/como vocês pagam/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pontos/i })).toBeInTheDocument();
    expect(screen.queryByText(/aeroporto/i)).not.toBeInTheDocument();
  });

  it("mantém o usuário no passo 1 quando 'Outro' não foi descrito", () => {
    render(<FareResearchWizard trajeto={flight} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /outro/i }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/descreva o tipo de translado/i);
    expect(screen.getAllByText(/tipo de translado/i).length).toBeGreaterThan(0);
  });

  it("exige dinheiro ou pontos antes de registrar", () => {
    render(<FareResearchWizard trajeto={flight} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    fireEvent.change(screen.getByPlaceholderText("0,00"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /registrar pesquisa/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/informe dinheiro e\/ou pontos/i);
  });
});
