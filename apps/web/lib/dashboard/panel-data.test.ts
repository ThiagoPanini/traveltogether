import type {
  BudgetSummary,
  NotificationPublic,
  PendingActionKind,
  PendingActionPublic,
  TripSummary,
} from "@traveltogether/types";
import { describe, expect, it } from "vitest";
import {
  budgetRows,
  buildHero,
  buildPanelData,
  countdown,
  greetingWord,
  notificationHref,
  notificationIcon,
  pendingToAlert,
} from "./panel-data";
import type { PendingItem } from "./pending";

function makeTrip(
  id: string,
  start: string,
  end: string,
  stops: { city: string; airport_code: string }[] = [],
): TripSummary {
  return {
    trip: {
      id,
      name: id,
      start_date: start,
      end_date: end,
      origin: "São Paulo",
      airport_code: "GRU",
    },
    membership: { role: "member" },
    stops,
    cover_image_url: null,
  } as unknown as TripSummary;
}

describe("countdown", () => {
  it("é 'past' quando a data já passou", () => {
    expect(countdown("2026-06-10", "2026-06-16")).toEqual({ kind: "past" });
  });

  it("é 'today' quando a data é hoje", () => {
    expect(countdown("2026-06-16", "2026-06-16")).toEqual({ kind: "today" });
  });

  it("conta os dias inteiros que faltam", () => {
    expect(countdown("2026-06-26", "2026-06-16")).toEqual({ kind: "days", days: 10 });
  });

  it("trunca datetime para o dia (Parada são datetime)", () => {
    expect(countdown("2026-06-17T23:30:00", "2026-06-16T01:00:00")).toEqual({
      kind: "days",
      days: 1,
    });
  });

  it("é 'past' quando a data é nula/indefinida", () => {
    expect(countdown(null, "2026-06-16")).toEqual({ kind: "past" });
  });
});

function makePending(kind: PendingItem["kind"]): PendingItem {
  return {
    kind,
    verb: kind === "fare_without_chosen" ? "Marcar a Escolhida" : "Registrar Pesquisa de Passagem",
    target: "GRU → LIS",
    tripId: "t1",
    tripName: "Portugal com a galera",
    href: "/trips/t1/legs/leg1",
  };
}

describe("pendingToAlert", () => {
  it("leva verbo como título e Trajeto · Viagem como subtítulo", () => {
    const alert = pendingToAlert(makePending("fare_without_chosen"));
    expect(alert.title).toBe("Marcar a Escolhida");
    expect(alert.sub).toBe("GRU → LIS · Portugal com a galera");
    expect(alert.href).toBe("/trips/t1/legs/leg1");
  });

  it("usa 'compass' para decidir a Escolhida e 'up' para registrar Pesquisa", () => {
    expect(pendingToAlert(makePending("fare_without_chosen")).icon).toBe("compass");
    expect(pendingToAlert(makePending("leg_without_fare")).icon).toBe("up");
  });
});

describe("budgetRows", () => {
  it("é vazio quando não há Orçamento", () => {
    expect(budgetRows(null)).toEqual([]);
  });

  it("mantém uma linha por moeda, sem conversão de câmbio (Invariante 15)", () => {
    const summary: BudgetSummary = {
      member_count: 3,
      subtotals: [
        { currency: "USD", per_group: "900.00", per_person: "300.00" },
        { currency: "BRL", per_group: "3600.00", per_person: "1200.00" },
      ],
    };
    const rows = budgetRows(summary);
    expect(rows.map((r) => r.currency)).toEqual(["BRL", "USD"]);
    expect(rows.map((r) => r.perPersonValue)).toEqual([1200, 300]);
    // nunca soma moedas distintas num único total
    expect(rows).toHaveLength(2);
  });

  it("formata o valor por pessoa na moeda da linha", () => {
    const summary: BudgetSummary = {
      member_count: 2,
      subtotals: [{ currency: "BRL", per_group: "2400.00", per_person: "1200.00" }],
    };
    expect(budgetRows(summary)[0].perPerson).toContain("1.200");
  });
});

describe("buildHero", () => {
  const trip = makeTrip("Portugal", "2026-07-01", "2026-07-08", [
    { city: "Lisboa", airport_code: "LIS" },
    { city: "Porto", airport_code: "OPO" },
  ]);

  it("deriva trajetos decididos a partir de Paradas e pendências (#58)", () => {
    const hero = buildHero({
      trip,
      pending: [makePending("fare_without_chosen")],
      budget: null,
      openTasks: 3,
      members: [],
      nowIso: "2026-06-16",
    });
    expect(hero.legsTotal).toBe(3); // origem → 2 Paradas → origem
    expect(hero.legsChosen).toBe(2); // 1 Trajeto ainda a decidir
    expect(hero.openTasks).toBe(3);
  });

  it("monta a rota origem → Paradas → origem e a contagem regressiva", () => {
    const hero = buildHero({
      trip,
      pending: [],
      budget: null,
      openTasks: 0,
      members: [],
      nowIso: "2026-06-16",
    });
    expect(hero.routeCodes).toEqual(["GRU", "LIS", "OPO", "GRU"]);
    expect(hero.countdown).toEqual({ kind: "days", days: 15 });
    expect(hero.nights).toBe(7);
  });

  it("rotula o estimado por pessoa por moeda, sem conversão (Invariante 15)", () => {
    const hero = buildHero({
      trip,
      pending: [],
      budget: {
        member_count: 3,
        subtotals: [
          { currency: "BRL", per_group: "3600.00", per_person: "1200.00" },
          { currency: "EUR", per_group: "900.00", per_person: "300.00" },
        ],
      },
      openTasks: 0,
      members: [],
      nowIso: "2026-06-16",
    });
    expect(hero.perPersonLabel).toContain("1.200");
    expect(hero.perPersonLabel).toContain("300");
    expect(hero.perPersonLabel).toContain("·"); // moedas lado a lado, nunca somadas
  });

  it("usa travessão quando não há Orçamento", () => {
    const hero = buildHero({
      trip,
      pending: [],
      budget: null,
      openTasks: 0,
      members: [],
      nowIso: "2026-06-16",
    });
    expect(hero.perPersonLabel).toBe("—");
  });
});

describe("greetingWord", () => {
  it("é 'Bom dia' antes do meio-dia", () => {
    expect(greetingWord(8)).toBe("Bom dia");
  });
  it("é 'Boa tarde' entre meio-dia e 18h", () => {
    expect(greetingWord(15)).toBe("Boa tarde");
  });
  it("é 'Boa noite' das 18h em diante", () => {
    expect(greetingWord(21)).toBe("Boa noite");
  });
});

describe("notificationIcon", () => {
  it("mapeia cada tipo ao seu ícone", () => {
    expect(notificationIcon("invite")).toBe("users");
    expect(notificationIcon("task")).toBe("checkSquare");
    expect(notificationIcon("mention")).toBe("chat");
    expect(notificationIcon("decision")).toBe("compass");
  });
});

describe("notificationHref", () => {
  it("aponta para a Viagem do aviso", () => {
    const notif = { kind: "invite", trip_id: "t9" } as NotificationPublic;
    expect(notificationHref(notif)).toBe("/trips/t9");
  });
});

function makePendingAction(tripId: string, kind: PendingActionKind): PendingActionPublic {
  return {
    kind,
    trip_id: tripId,
    trip_name: "Portugal",
    target_kind: kind === "stop_without_itinerary" ? "stop" : "leg",
    target_id: "x1",
    label: "GRU → LIS",
  };
}

describe("buildPanelData", () => {
  const trip = makeTrip("Portugal", "2026-07-01", "2026-07-08", [
    { city: "Lisboa", airport_code: "LIS" },
  ]);

  const baseInput = {
    userName: "Thiago Panini",
    now: new Date("2026-06-16T09:00:00"),
    nextTrip: trip,
    trips: [trip],
    pending: [
      makePendingAction("Portugal", "fare_without_chosen"),
      makePendingAction("Portugal", "stop_without_itinerary"),
    ],
    tasks: [],
    activity: [],
    notifications: { unread_count: 0, items: [] },
    heroBudget: {
      member_count: 2,
      subtotals: [{ currency: "BRL", per_group: "2400.00", per_person: "1200.00" }],
    } as BudgetSummary,
    heroMembers: [],
  };

  it("saúda pelo primeiro nome conforme a hora", () => {
    expect(buildPanelData(baseInput).greeting).toBe("Bom dia, Thiago.");
  });

  it("'o que precisa de mim' exclui Roteiro pendente (só Trajetos)", () => {
    const data = buildPanelData(baseInput);
    expect(data.alerts).toHaveLength(1);
    expect(data.alerts[0].title).toBe("Marcar a Escolhida");
  });

  it("monta o hero e o snapshot de Orçamento da próxima Viagem", () => {
    const data = buildPanelData(baseInput);
    expect(data.hero?.name).toBe("Portugal");
    expect(data.budget?.rows).toHaveLength(1);
    expect(data.hasTrips).toBe(true);
  });

  it("sem próxima Viagem não há hero nem snapshot", () => {
    const data = buildPanelData({ ...baseInput, nextTrip: null });
    expect(data.hero).toBeNull();
    expect(data.budget).toBeNull();
  });

  it("conta o total de pendências e Tarefas para os badges (não a fatia exibida)", () => {
    const manyPending = Array.from({ length: 7 }, () =>
      makePendingAction("Portugal", "fare_without_chosen"),
    );
    const data = buildPanelData({ ...baseInput, pending: manyPending });
    expect(data.alerts).toHaveLength(5); // fatia exibida
    expect(data.pendingCount).toBe(7); // total para o badge
    expect(data.taskCount).toBe(baseInput.tasks.length);
  });
});
