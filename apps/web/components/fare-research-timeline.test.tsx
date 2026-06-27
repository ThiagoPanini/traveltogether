import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Trajeto } from "@/lib/trips/backbone";
import {
  createFareResearchDraft,
  fareResearchFromDraft,
  saveFareResearches,
  trajectoryKey,
} from "@/lib/trips/fare-research";
import { FareResearchTimeline } from "./fare-research-timeline";

const trajeto: Trajeto = {
  kind: "ida",
  from: "São Paulo",
  to: "Nova York",
  transfer: { kind: "plane", other_text: null },
  date: null,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("FareResearchTimeline", () => {
  it("restaura a ficha da Viagem sob o Trajeto e oferece editar/remover", async () => {
    const draft = createFareResearchDraft(trajeto);
    draft.provider = "LATAM";
    draft.reference = "LA 8180";
    draft.moneyAmount = "3420.5";
    draft.segments[0].departureDate = "2026-09-14";
    draft.segments[0].originCode = "GRU";
    draft.segments[0].destinationCode = "JFK";
    const research = fareResearchFromDraft(draft, trajectoryKey(trajeto, 0), "q1");
    saveFareResearches("trip-a", [research]);

    render(<FareResearchTimeline tripId="trip-a" trajetos={[trajeto]} />);

    expect(await screen.findByText("GRU → JFK")).toBeInTheDocument();
    expect(screen.getByText(/LATAM · LA 8180/i)).toBeInTheDocument();
    expect(screen.getByText("dinheiro")).toBeInTheDocument();
    expect(screen.queryByText(/3\.420,50/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar Pesquisa 1/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remover Pesquisa 1/i }));
    expect(screen.getByRole("group", { name: /confirmar remoção/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.getByText("GRU → JFK")).toBeInTheDocument();
  });

  it("Viagens diferentes não compartilham fichas locais", async () => {
    const draft = createFareResearchDraft(trajeto);
    draft.provider = "LATAM";
    draft.moneyAmount = "1000";
    const research = fareResearchFromDraft(draft, trajectoryKey(trajeto, 0), "q1");
    saveFareResearches("trip-a", [research]);

    render(<FareResearchTimeline tripId="trip-b" trajetos={[trajeto]} />);

    expect(await screen.findByRole("button", { name: /registrar pesquisa/i })).toBeInTheDocument();
    expect(screen.queryByText("LATAM")).not.toBeInTheDocument();
  });
});
