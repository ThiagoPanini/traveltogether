import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "@/lib/trips/draft";
import { TripWizard } from "./trip-wizard";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const origin = { city: "São Paulo", country: "BR" };

function fillDestino(city = "Roma", name = "Costa Leste") {
  fireEvent.change(screen.getByLabelText(/cidade do destino/i), { target: { value: city } });
  fireEvent.change(screen.getByLabelText(/nome da viagem/i), { target: { value: name } });
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
  it("renderiza país, cidade e nome", () => {
    render(<TripWizard origin={origin} />);
    expect(screen.getByLabelText(/país do destino/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cidade do destino/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome da viagem/i)).toBeInTheDocument();
  });

  it("'Próximo' fica desabilitado até informar a cidade de destino", () => {
    render(<TripWizard origin={origin} />);
    expect(screen.getByRole("button", { name: /próximo/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/cidade do destino/i), { target: { value: "Roma" } });
    expect(screen.getByRole("button", { name: /próximo/i })).toBeEnabled();
  });
});

describe("TripWizard — navegação e paradas", () => {
  it("avança ao passo 2 mostrando origem (do Perfil) e destino", () => {
    render(<TripWizard origin={origin} />);
    fillDestino();
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));

    expect(screen.getByText(/origem · você/i)).toBeInTheDocument();
    expect(screen.getByText("São Paulo")).toBeInTheDocument();
    expect(screen.getByText(/destino final/i)).toBeInTheDocument();
    expect(screen.getByText(/1 cidade na rota/i)).toBeInTheDocument();
  });

  it("inserir parada aumenta o contador de cidades", () => {
    render(<TripWizard origin={origin} />);
    fillDestino();
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));

    fireEvent.click(screen.getAllByRole("button", { name: /\+ parada aqui/i })[0]);
    expect(screen.getByText(/2 cidades na rota/i)).toBeInTheDocument();
  });

  it("digitar a cidade de uma parada do meio não sobrescreve o destino", () => {
    render(<TripWizard origin={origin} />);
    fillDestino("Roma", "Costa Leste");
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /\+ parada aqui/i })[0]);

    // ordem na trilha: [0] = parada do meio, [1] = destino
    const cities = screen.getAllByLabelText("Cidade");
    expect(cities[1]).toHaveValue("Roma");

    fireEvent.change(cities[0], { target: { value: "Florença" } });

    const after = screen.getAllByLabelText("Cidade");
    expect(after[0]).toHaveValue("Florença");
    expect(after[1]).toHaveValue("Roma");
  });
});

describe("TripWizard — tripulação (passo 5)", () => {
  function goToStep(label: RegExp) {
    fireEvent.click(screen.getByRole("button", { name: label }));
  }

  it("adiciona convite cego com toggle de papel", () => {
    render(<TripWizard origin={origin} />);
    fillDestino();
    goToStep(/tripulação/i);

    fireEvent.change(screen.getByLabelText(/e-mail do convidado/i), {
      target: { value: "ana@exemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /adicionar/i }));

    expect(screen.getByText("ana@exemplo.com")).toBeInTheDocument();
    expect(screen.getByText(/pendente/i)).toBeInTheDocument();

    const organizador = screen.getByRole("button", { name: /organizador/i });
    expect(organizador).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(organizador);
    expect(screen.getByRole("button", { name: /organizador/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("TripWizard — persistência do rascunho", () => {
  it("salva no localStorage e restaura após remontar (reload)", async () => {
    const { unmount } = render(<TripWizard origin={origin} />);
    fillDestino("Roma", "Minha Viagem");

    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toContain("Roma"));
    unmount();

    render(<TripWizard origin={origin} />);
    await waitFor(() => expect(screen.getByLabelText(/cidade do destino/i)).toHaveValue("Roma"));
    expect(screen.getByLabelText(/nome da viagem/i)).toHaveValue("Minha Viagem");
  });
});

describe("TripWizard — confirmar (POST atômico)", () => {
  function reachConfirm() {
    render(<TripWizard origin={origin} />);
    fillDestino();
    fireEvent.click(screen.getByRole("button", { name: /^resumo$/i }));
  }

  it("cria a viagem, limpa o rascunho e navega pro backbone", async () => {
    reachConfirm();
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
    reachConfirm();
    fireEvent.click(screen.getByRole("button", { name: /criar viagem/i }));

    await screen.findByRole("alert");
    expect(push).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain("Costa Leste");
  });
});
