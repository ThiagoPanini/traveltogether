import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  it("restaura a pesquisa local sob o Trajeto e mostra preço nativo", async () => {
    const draft = createFareResearchDraft(trajeto);
    draft.provider = "LATAM";
    draft.moneyAmount = "3420.5";
    draft.segments[0].originCode = "GRU";
    draft.segments[0].destinationCode = "JFK";
    const research = fareResearchFromDraft(draft, trajectoryKey(trajeto, 0), "q1");
    saveFareResearches("trip-a", [research]);

    render(<FareResearchTimeline tripId="trip-a" trajetos={[trajeto]} currentUserInitials="MA" />);

    expect(await screen.findByText("GRU → JFK · LATAM")).toBeInTheDocument();
    expect(screen.getByText("R$ 3.420,50")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /marcar preferida/i })).toBeInTheDocument();
  });

  it("Viagens diferentes não compartilham fichas locais", async () => {
    const draft = createFareResearchDraft(trajeto);
    draft.provider = "LATAM";
    draft.moneyAmount = "1000";
    const research = fareResearchFromDraft(draft, trajectoryKey(trajeto, 0), "q1");
    saveFareResearches("trip-a", [research]);

    render(<FareResearchTimeline tripId="trip-b" trajetos={[trajeto]} />);

    expect((await screen.findAllByText(/sem pesquisas ainda/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText("LATAM")).not.toBeInTheDocument();
  });

  it("avisa o painel quantos trajetos têm pesquisa", async () => {
    const onSummaryChange = vi.fn();
    render(
      <FareResearchTimeline
        tripId="trip-empty"
        trajetos={[trajeto]}
        onSummaryChange={onSummaryChange}
      />,
    );

    await waitFor(() => expect(onSummaryChange).toHaveBeenCalledWith({ done: 0, total: 1 }));
  });

  it("abre o takeover de pesquisa pelo CTA do trajeto", async () => {
    render(<FareResearchTimeline tripId="trip-a" trajetos={[trajeto]} tripName="Costa Leste" />);

    fireEvent.click(screen.getByRole("button", { name: /\+ pesquisar translado/i }));

    expect(await screen.findByRole("dialog", { name: /pesquisar translado/i })).toBeInTheDocument();
    expect(screen.getByText(/costa leste/i)).toBeInTheDocument();
  });
});
