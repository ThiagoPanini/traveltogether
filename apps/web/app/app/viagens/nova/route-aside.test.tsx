import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/geo/cities", () => ({
  findCity: vi.fn(async () => ({
    name: "São Paulo",
    asciiName: "Sao Paulo",
    lat: -23.55,
    lng: -46.63,
    population: 12_000_000,
  })),
}));

vi.mock("./route-map", () => ({
  RouteMap: ({ nodes }: { nodes: Array<{ kind: string; label: string }> }) => (
    <div>
      {nodes.map((node) => (
        <span key={`${node.kind}-${node.label}`}>
          Pino {node.kind}: {node.label}
        </span>
      ))}
    </div>
  ),
}));

import { RouteAside } from "./route-aside";

describe("RouteAside", () => {
  it("plota a origem reconhecida no passo de paradas", async () => {
    // given: origem textual do Perfil e destino com coordenadas
    const stops = [
      {
        id: "destino",
        city: "Roma",
        country: "IT",
        arrivalDate: null,
        desiredTransfer: null,
        lat: 41.9,
        lng: 12.5,
      },
    ];

    // when: o painel do passo 2 pede a origem no mapa
    render(
      <RouteAside
        origin={{ city: "Sao Paulo", country: "BR" }}
        stops={stops}
        entryTransfer={null}
        caption="Rota no mapa"
        plotOrigin
      />,
    );

    // then: a geocodificação best-effort produz o pino verde da origem
    expect(await screen.findByText("Pino origin: São Paulo")).toBeInTheDocument();
  });
});
