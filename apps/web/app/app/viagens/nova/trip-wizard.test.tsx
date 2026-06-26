import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "@/lib/trips/draft";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Substitui searchCities para não depender de import() dinâmico em jsdom.
vi.mock("@/lib/geo/cities", () => ({
  findCity: vi.fn(async () => null),
  searchCities: vi.fn(async (_country: string, query: string) => {
    const all = [
      { name: "Roma", asciiName: "Roma", lat: 41.9, lng: 12.5, population: 2318895 },
      { name: "Florença", asciiName: "Florenca", lat: 43.77, lng: 11.25, population: 349296 },
      { name: "Veneza", asciiName: "Veneza", lat: 45.44, lng: 12.34, population: 261905 },
    ];
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter((c) => c.asciiName.toLowerCase().includes(q));
  }),
  searchCitiesGlobal: vi.fn(async (query: string) => {
    const all = [
      {
        name: "Florença",
        asciiName: "Florenca",
        country: "IT",
        lat: 43.77,
        lng: 11.25,
        population: 349296,
      },
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

  it("inserir uma parada busca só a cidade e infere o país", async () => {
    render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance();

    fireEvent.click(screen.getAllByRole("button", { name: /adicionar parada neste ponto/i })[0]);

    expect(screen.queryByLabelText("País")).not.toBeInTheDocument();
    const cidade = screen.getByLabelText("Cidade da parada");
    fireEvent.focus(cidade);
    fireEvent.change(cidade, { target: { value: "flo" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "Florença · Itália" }));

    expect(screen.getByText(/2 cidades na rota/i)).toBeInTheDocument();
    expect(screen.getAllByText("Florença").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Itália").length).toBeGreaterThan(0);
  });

  it("cidade fora do índice continua adicionável como texto livre", async () => {
    render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance();

    fireEvent.click(screen.getAllByRole("button", { name: /adicionar parada neste ponto/i })[0]);
    const cidade = screen.getByLabelText("Cidade da parada");
    fireEvent.focus(cidade);
    fireEvent.change(cidade, { target: { value: "Xique-Xique" } });
    fireEvent.mouseDown(
      await screen.findByRole("option", {
        name: /minha cidade não está na lista/i,
      }),
    );

    expect(screen.getAllByText("Xique-Xique").length).toBeGreaterThan(0);
    expect(screen.getByText("País a definir")).toBeInTheDocument();
  });
});

describe("TripWizard — translados (passo 3)", () => {
  it("mostra trilha horizontal e define um trajeto como em discussão pelo card do modal", async () => {
    // given: rota direta da origem ao destino
    render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance(); // -> 2
    advance(); // -> 3

    // when: abre o anel entre as cidades
    const trail = screen.getByRole("region", { name: /trilha de translados/i });
    fireEvent.click(
      within(trail).getByRole("button", {
        name: /definir translado de são paulo para roma/i,
      }),
    );

    // then: modal oferece "Em discussão" como card e fecha ao aplicá-lo
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /em discussão/i })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /fechar modal de translado/i }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /em discussão/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(trail).getByText("Em discussão")).toBeInTheDocument();
  });

  it("aplica texto livre pelo botão inline e mantém o aviso só neste passo", async () => {
    // given: modal do único trajeto aberto
    render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance(); // -> 2
    advance(); // -> 3
    expect(screen.getByText(/translados são propostas, não compras/i)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: /definir translado de são paulo para roma/i,
      }),
    );

    // when: informa e aplica outro tipo
    fireEvent.change(screen.getByLabelText(/outro tipo/i), { target: { value: "Balsa" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    // then: trilha mostra proposta e resumo não repete o aviso
    expect(screen.getByText("Balsa")).toBeInTheDocument();
    advance(); // -> 4
    advance(); // -> 5
    advance(); // -> 6
    expect(screen.queryByText(/translados são propostas, não compras/i)).not.toBeInTheDocument();
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

    expect(screen.queryByText("Sua viagem")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Papel do convidado" })).not.toBeInTheDocument();

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

describe("TripWizard — identidade e resumo (passos 4 e 6)", () => {
  it("preserva casing do nome e resume nome, descrição, convidados e tripulação", async () => {
    // given: viagem nomeada com um Convite
    render(<TripWizard origin={origin} />);
    await pickDestino("Roma");
    advance(); // -> 2
    advance(); // -> 3
    advance(); // -> 4
    const name = screen.getByLabelText(/nome da viagem/i);
    fireEvent.change(name, { target: { value: "Costa Leste" } });
    fireEvent.change(screen.getByLabelText(/descrição/i), {
      target: { value: "Duas semanas sem pressa." },
    });
    expect(name).toHaveValue("Costa Leste");
    advance(); // -> 5
    fireEvent.change(screen.getByLabelText(/e-mail do convidado/i), {
      target: { value: "ana@exemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    // when: chega ao resumo
    advance(); // -> 6

    // then: topo preserva conteúdo e resumo contém só Tripulação
    expect(screen.getByRole("heading", { level: 2, name: "Costa Leste" })).toBeInTheDocument();
    expect(screen.getByText("Duas semanas sem pressa.")).toBeInTheDocument();
    expect(screen.queryByText("Trechos aéreos")).not.toBeInTheDocument();
    const invitedLabel = screen.getByText("Pessoas convidadas");
    expect(within(invitedLabel.parentElement as HTMLElement).getByText("1")).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Resumo da viagem" });
    expect(within(summary).getByText("Tripulação")).toBeInTheDocument();
    expect(within(summary).queryByText("Rota")).not.toBeInTheDocument();
    expect(within(summary).queryByText("Translados")).not.toBeInTheDocument();
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
