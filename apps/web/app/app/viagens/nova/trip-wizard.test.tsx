import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "@/lib/trips/draft";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { TripWizard } from "./trip-wizard";

const origin = { city: "São Paulo", country: "BR" };

async function renderWizard() {
  render(<TripWizard origin={origin} />);
  await screen.findByLabelText(/cidade destino/i);
}

async function fillDestination(city = "Orlando") {
  await screen.findByLabelText(/cidade destino/i);
  fireEvent.change(screen.getByLabelText(/cidade destino/i), { target: { value: city } });
  fireEvent.change(screen.getByLabelText(/país do destino/i), { target: { value: "US" } });
}

function advance() {
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
}

async function reachSummary() {
  await renderWizard();
  await fillDestination("Orlando");
  advance(); // paradas
  advance(); // translados
  advance(); // nome
  fireEvent.change(screen.getByLabelText(/nome da viagem/i), {
    target: { value: "Férias em Orlando" },
  });
  advance(); // tripulação
  fireEvent.change(screen.getByPlaceholderText("email@convidado.com"), {
    target: { value: "ana@exemplo.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: /\+ convidar/i }));
  advance(); // resumo
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "new-trip" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
  window.localStorage.clear();
});

describe("TripWizard — redesign de nova viagem", () => {
  it("passo 1 pede destino e país, sem nome da viagem", async () => {
    await renderWizard();
    expect(screen.getByLabelText(/cidade destino/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/país do destino/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nome da viagem/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();

    await fillDestination("Orlando");
    expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled();
  });

  it("passo 2 adiciona parada simples antes do destino", async () => {
    await renderWizard();
    await fillDestination("Orlando");
    advance();

    fireEvent.change(screen.getByPlaceholderText(/adicionar parada/i), {
      target: { value: "Miami" },
    });
    fireEvent.click(screen.getByRole("button", { name: /\+ parada/i }));

    expect(screen.getAllByText("Miami").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Orlando").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 cidades/i).length).toBeGreaterThan(0);
  });

  it("passo 3 define translado por card inline", async () => {
    await renderWizard();
    await fillDestination("Orlando");
    advance();
    advance();

    const leg = screen.getByRole("button", { name: /trajeto 1 de 1/i });
    fireEvent.click(leg);
    fireEvent.click(screen.getByRole("button", { name: /avião/i }));

    expect(screen.getByText("Avião")).toBeInTheDocument();
  });

  it("passos 4-6 resumem nome e tripulação", async () => {
    await reachSummary();

    expect(screen.getByRole("heading", { name: /tudo pronto para embarcar/i })).toBeInTheDocument();
    expect(screen.getByText("Férias em Orlando")).toBeInTheDocument();
    expect(screen.getByText("2 a bordo")).toBeInTheDocument();
  });

  it("salva no localStorage e restaura após remontar", async () => {
    const { unmount } = render(<TripWizard origin={origin} />);
    await screen.findByLabelText(/cidade destino/i);
    await fillDestination("Orlando");
    advance();
    advance();
    advance();
    fireEvent.change(screen.getByLabelText(/nome da viagem/i), {
      target: { value: "Minha Viagem" },
    });

    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toContain("Minha Viagem"));
    unmount();

    render(<TripWizard origin={origin} />);
    await waitFor(() =>
      expect(screen.getByLabelText(/nome da viagem/i)).toHaveValue("Minha Viagem"),
    );
  });

  it("cria a viagem, limpa o rascunho e navega para o painel dela", async () => {
    await reachSummary();
    fireEvent.click(screen.getByRole("button", { name: /criar viagem/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("/api/trips");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.name).toBe("Férias em Orlando");
    expect(body.stops.at(-1).city).toBe("Orlando");
    expect(body.invitations).toEqual([{ email: "ana@exemplo.com", role: "member" }]);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/viagens/new-trip"));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falha no POST mantém o rascunho e mostra erro", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    await reachSummary();
    fireEvent.click(screen.getByRole("button", { name: /criar viagem/i }));

    await screen.findByText(/não consegui criar a viagem/i);
    expect(push).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain("Férias em Orlando");
  });
});
