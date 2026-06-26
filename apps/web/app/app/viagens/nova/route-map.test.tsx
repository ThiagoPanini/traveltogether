import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteMap } from "./route-map";

const { map, vectorMapConstructor } = vi.hoisted(() => ({
  map: {
    addLines: vi.fn(),
    addMarkers: vi.fn(),
    coordsToPoint: vi.fn(() => ({ x: 120, y: 80 })),
    destroy: vi.fn(),
    removeLines: vi.fn(),
    removeMarkers: vi.fn(),
    reset: vi.fn(),
    setFocus: vi.fn(),
  },
  vectorMapConstructor: vi.fn(),
}));

vi.mock("jsvectormap", () => ({
  default: function MockVectorMap(this: typeof map, options: unknown) {
    vectorMapConstructor(options);
    const { selector } = options as { selector: HTMLElement };
    selector.innerHTML = '<svg><path data-code="BR" /></svg>';
    Object.assign(this, map);
  },
}));
vi.mock("jsvectormap/dist/maps/world.js", () => ({}));

describe("RouteMap", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      value: 640,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("mostra o globo mesmo sem destino escolhido", async () => {
    // given: a criação acabou de abrir, sem nenhum nó plotável
    render(<RouteMap nodes={[]} fallback={<p>Rota vertical</p>} />);

    // when: o mapa client-only termina de montar
    await waitFor(() => expect(vectorMapConstructor).toHaveBeenCalledOnce());

    // then: o mapa é a superfície principal, não o fallback de rota
    expect(screen.getByRole("img", { name: /mapa esquemático/i })).toBeInTheDocument();
  });

  it("mantém a instância e anima o foco quando o país muda", async () => {
    // given: o globo já montado no estado inicial
    const { rerender } = render(<RouteMap nodes={[]} fallback={<p>Rota vertical</p>} />);
    await waitFor(() => expect(vectorMapConstructor).toHaveBeenCalledOnce());

    // when: a pessoa escolhe um país
    rerender(<RouteMap focus={{ countryCode: "BR" }} nodes={[]} fallback={<p>Rota vertical</p>} />);

    // then: a mesma instância recebe foco imperativo animado
    await waitFor(() =>
      expect(map.setFocus).toHaveBeenCalledWith({ regions: ["BR"], animate: true }),
    );
    expect(vectorMapConstructor).toHaveBeenCalledOnce();
  });

  it("contorna o país escolhido com o destaque animado", async () => {
    // given: o globo montado com as regiões vetoriais
    const { container, rerender } = render(<RouteMap nodes={[]} fallback={<p>Rota vertical</p>} />);
    await waitFor(() => expect(vectorMapConstructor).toHaveBeenCalledOnce());

    // when: a pessoa escolhe o Brasil
    rerender(<RouteMap focus={{ countryCode: "BR" }} nodes={[]} fallback={<p>Rota vertical</p>} />);

    // then: a fronteira recebe o contorno visual de país ativo
    const country = container.querySelector('path[data-code="BR"]');
    await waitFor(() => expect(country?.getAttribute("class") ?? "").toMatch(/countryOutline/));
  });

  it("foca a cidade e mantém o pino HTML colado à coordenada", async () => {
    // given: uma cidade de destino com coordenadas
    const destination = {
      lat: -23.55,
      lng: -46.63,
      label: "São Paulo",
      kind: "dest" as const,
    };

    // when: o mapa recebe a cidade como foco e nó
    render(
      <RouteMap
        focus={{
          countryCode: "BR",
          coords: { lat: destination.lat, lng: destination.lng },
          scale: 5,
        }}
        nodes={[destination]}
        fallback={<p>Rota vertical</p>}
      />,
    );

    // then: o zoom é animado e o pino usa a projeção do mapa
    await waitFor(() =>
      expect(map.setFocus).toHaveBeenCalledWith({
        coords: [-23.55, -46.63],
        scale: 5,
        animate: true,
      }),
    );
    const pin = screen.getByText("São Paulo").parentElement;
    await waitFor(() => expect(pin).toHaveStyle({ left: "120px", top: "80px", opacity: "1" }));
    expect(document.querySelector('path[data-code="BR"]')?.getAttribute("class") ?? "").toMatch(
      /countryOutline/,
    );
  });

  it("atualiza os nós e as arestas sem reconstruir o mapa", async () => {
    // given: uma rota com origem, destino e o salto entre eles
    const nodes = [
      { lat: -23.55, lng: -46.63, label: "São Paulo", kind: "origin" as const },
      { lat: 41.9, lng: 12.5, label: "Roma", kind: "dest" as const },
    ];

    // when: o mapa recebe a rota completa
    render(
      <RouteMap
        nodes={nodes}
        edges={[{ from: 0, to: 1, defined: true }]}
        fallback={<p>Rota vertical</p>}
      />,
    );

    // then: ancora a linha nos pontos e conserva a instância persistente
    await waitFor(() =>
      expect(map.addMarkers).toHaveBeenCalledWith([
        { name: "0", coords: [-23.55, -46.63] },
        { name: "1", coords: [41.9, 12.5] },
      ]),
    );
    expect(map.addLines).toHaveBeenCalledWith([{ from: "0", to: "1" }]);
    expect(vectorMapConstructor).toHaveBeenCalledOnce();
  });

  it("volta ao globo quando a jornada passa a ter vários pontos", async () => {
    // given: o mapa focado numa cidade no passo 1
    const destination = { lat: 41.9, lng: 12.5, label: "Roma", kind: "dest" as const };
    const { rerender } = render(
      <RouteMap
        focus={{ coords: { lat: 41.9, lng: 12.5 }, scale: 5 }}
        nodes={[destination]}
        fallback={<p>Rota vertical</p>}
      />,
    );
    await waitFor(() => expect(map.setFocus).toHaveBeenCalled());

    // when: a origem entra e o foco pontual deixa de existir
    rerender(
      <RouteMap
        nodes={[{ lat: -23.55, lng: -46.63, label: "São Paulo", kind: "origin" }, destination]}
        fallback={<p>Rota vertical</p>}
      />,
    );

    // then: abre o globo para enquadrar a jornada, sem reconstruir a instância
    await waitFor(() => expect(map.reset).toHaveBeenCalled());
    expect(vectorMapConstructor).toHaveBeenCalledOnce();
  });
});
