import type { ItineraryItemPublic } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { buildItineraryDays } from "./days";

function item(over: Partial<ItineraryItemPublic> & { id: string }): ItineraryItemPublic {
  return {
    stop_id: "s1",
    title: "Item",
    notes: "",
    link: "",
    day: null,
    time: null,
    order: 0,
    ...over,
  };
}

describe("buildItineraryDays", () => {
  it("deriva dias numerados das datas da Parada (chegada→partida) e ordena itens por horário", () => {
    const result = buildItineraryDays("2026-07-01T00:00:00", "2026-07-03T00:00:00", [
      item({ id: "a", day: "2026-07-01", time: "14:00" }),
      item({ id: "b", day: "2026-07-01", time: "09:00" }),
      item({ id: "c", day: "2026-07-02" }),
    ]);

    expect(result.hasWindow).toBe(true);
    // 2 noites → 3 dias
    expect(result.days.map((d) => d.n)).toEqual([1, 2, 3]);
    expect(result.days[0].date).toBe("2026-07-01");
    // ordenado por horário ascendente
    expect(result.days[0].items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(result.days[1].items.map((i) => i.id)).toEqual(["c"]);
    expect(result.days[2].items).toEqual([]);
  });

  it("itens sem dia ou fora da janela caem em 'sem dia definido'", () => {
    const result = buildItineraryDays("2026-07-01", "2026-07-02", [
      item({ id: "x", day: null }),
      item({ id: "y", day: "2026-09-30" }),
      item({ id: "z", day: "2026-07-01" }),
    ]);

    expect(result.unscheduled.map((i) => i.id)).toEqual(["x", "y"]);
    expect(result.days[0].items.map((i) => i.id)).toEqual(["z"]);
  });

  it("sem janela de datas: nenhum dia, tudo sem dia definido", () => {
    const result = buildItineraryDays(null, null, [item({ id: "a", day: "2026-07-01" })]);

    expect(result.hasWindow).toBe(false);
    expect(result.days).toEqual([]);
    expect(result.unscheduled.map((i) => i.id)).toEqual(["a"]);
  });
});
