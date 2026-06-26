import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "@/lib/trips/draft";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Substitui searchCities para não depender de import() dinâmico em jsdom.
vi.mock("@/lib/geo/cities", () => ({
  searchCities: vi.fn(async (_country: string, query: string) => {
    const all = [
      { name: "Roma", asciiName: "Roma" },
      { name: "Florença", asciiName: "Florenca" },
      { name: "Veneza", asciiName: "Veneza" },
    ];
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter((c) => c.asciiName.toLowerCase().includes(q));
  }),
}));

import { TripWizard } from "./trip-wizard";

const origin = { city: "São Paulo", country: "BR" };

/** Seleciona país (Itália) → cidade no combobox do passo 1. */
async function pickDestino(city = "Roma") {
  const pais = screen.getByLabelText(/país do destino/i);
  fireEvent.focus(pais);
  fireEvent.change(pais, { target: { value: "Itál" } });
  fireEvent.mouseDown(await screen.findByRole("option", { name: "Itália" }));

  const cidade = screen.getByLabelText(/cidade do destino/i);
  fireEvent.focus(cidade);
  fireEvent.change(cidade, { target: { value: city.slice(0, 3) } });
  fireEvent.mouseDown(await screen.findByRole("option", { name: city }));
}

/** Clica "Continuar" no rodapé (avança um passo). */
function advance() {
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
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

describe("TripWizard — passo 1 (Destino)", () => {
  it("mostra país e cidade do destino (e não o nome — que migrou pro passo 4)", () => {
    render(<TripWizard origin={origin} />);
    expect(screen.getByLabelText(/país do destino/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cidade do destino/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nome da viagem/i)).not.toBeInTheDocument();
  });

  it("'Continuar' fica desabilitado até escolher a cidade de destino", async () => {
    render(<TripWizard origin={origin} />);
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
    await pickDestino("Roma");
    expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled();
  });
});

describe("TripWizard — navegação e paradas", () => {
  it("avança ao passo 2 mostrando origem (do Perfil) e o contador de cidades", async () => {
    render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance();

    expect(screen.getAllByText(/origem · você/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("São Paulo").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 cidade na rota/i)).toBeInTheDocument();
  });

  it("inserir uma parada pelo + aumenta o contador de cidades", async () => {
    render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance();

    fireEvent.click(screen.getAllByRole("button", { name: /adicionar parada neste ponto/i })[0]);

    const pais = screen.getByLabelText("País");
    fireEvent.focus(pais);
    fireEvent.change(pais, { target: { value: "Itál" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "Itália" }));

    const cidade = screen.getByLabelText("Cidade");
    fireEvent.focus(cidade);
    fireEvent.change(cidade, { target: { value: "flo" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "Florença" }));

    expect(screen.getByText(/2 cidades na rota/i)).toBeInTheDocument();
  });
});

describe("TripWizard — tripulação (passo 5)", () => {
  it("adiciona convite cego com toggle de papel", async () => {
    render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance(); // -> 2
    advance(); // -> 3
    advance(); // -> 4
    advance(); // -> 5

    fireEvent.change(screen.getByLabelText(/e-mail do convidado/i), {
      target: { value: "ana@exemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    expect(screen.getByText("ana@exemplo.com")).toBeInTheDocument();
    expect(screen.getByText(/pendente/i)).toBeInTheDocument();

    // O convite é cego: só e-mail/pendente/papel, nenhum dado de perfil falso.
    const card = within(screen.getByRole("group", { name: /papel de ana@exemplo\.com/i }));
    const organizador = card.getByRole("button", { name: /organizador/i });
    expect(organizador).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(organizador);
    expect(card.getByRole("button", { name: /organizador/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("TripWizard — persistência do rascunho", () => {
  it("salva no localStorage e restaura após remontar (reload)", async () => {
    const { unmount } = render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance(); // -> 2
    advance(); // -> 3
    advance(); // -> 4
    fireEvent.change(screen.getByLabelText(/nome da viagem/i), {
      target: { value: "Minha Viagem" },
    });

    await waitFor(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
      expect(raw).toContain("Roma");
      expect(raw).toContain("Minha Viagem");
    });
    unmount();

    render(<TripWizard origin={origin} />);
    // Restaura no passo 4 (o passo também persiste).
    await waitFor(() =>
      expect(screen.getByLabelText(/nome da viagem/i)).toHaveValue("Minha Viagem"),
    );

    // Voltar até o passo 1 mostra o destino restaurado no combobox (fix de hidratação).
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    await waitFor(() => expect(screen.getByLabelText(/cidade do destino/i)).toHaveValue("Roma"));
  });
});

describe("TripWizard — confirmar (POST atômico)", () => {
  async function reachConfirm() {
    render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance(); // -> 2
    advance(); // -> 3
    advance(); // -> 4
    fireEvent.change(screen.getByLabelText(/nome da viagem/i), {
      target: { value: "Costa Leste" },
    });
    advance(); // -> 5
    advance(); // -> 6
  }

  it("cria a viagem, limpa o rascunho e navega pro backbone", async () => {
    await reachConfirm();
    fireEvent.click(screen.getByRole("button", { name: /criar viagem/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("/api/trips");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.name).toBe("Costa Leste");
    expect(body.stops.at(-1).city).toBe("Roma");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/viagens/new-trip"));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falha no POST mantém o rascunho e mostra erro", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    await reachConfirm();
    fireEvent.click(screen.getByRole("button", { name: /criar viagem/i }));

    await screen.findByRole("alert");
    expect(push).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain("Costa Leste");
  });
});
