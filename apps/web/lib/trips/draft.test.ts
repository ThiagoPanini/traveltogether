import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canSubmit,
  clearDraft,
  createInitialDraft,
  draftToPayload,
  getDestination,
  getMiddleStops,
  loadDraft,
  STORAGE_KEY,
  saveDraft,
  type TripDraft,
  tripDraftReducer,
} from "./draft";

/** Aplica uma sequência de ações sobre o rascunho inicial. */
function run(...actions: Parameters<typeof tripDraftReducer>[1][]): TripDraft {
  return actions.reduce(tripDraftReducer, createInitialDraft());
}

describe("createInitialDraft", () => {
  it("começa no passo 1 com uma única parada (o destino) e sem translado pessoal", () => {
    // when
    const draft = createInitialDraft();
    // then
    expect(draft.step).toBe(1);
    expect(draft.stops).toHaveLength(1);
    expect(getDestination(draft).desiredTransfer).toBeNull();
    expect(draft.invitations).toEqual([]);
    expect(draft.entryTransfer).toBeNull();
  });

  it("dá ids distintos a paradas diferentes", () => {
    // given
    const draft = run({ type: "addStop" });
    // then
    expect(draft.stops[0].id).not.toBe(draft.stops[1].id);
  });
});

describe("tripDraftReducer — navegação de passos", () => {
  it("'next' avança e 'prev' retrocede", () => {
    // when
    const draft = run({ type: "next" }, { type: "next" }, { type: "prev" });
    // then
    expect(draft.step).toBe(2);
  });

  it("'next' não passa do passo 6 e 'prev' não cai abaixo do 1", () => {
    // when
    const top = run(...Array(10).fill({ type: "next" as const }));
    const bottom = run(...Array(10).fill({ type: "prev" as const }));
    // then
    expect(top.step).toBe(6);
    expect(bottom.step).toBe(1);
  });

  it("'setStep' salta direto e clampa fora da faixa", () => {
    expect(run({ type: "setStep", step: 4 }).step).toBe(4);
    expect(run({ type: "setStep", step: 99 }).step).toBe(6);
    expect(run({ type: "setStep", step: -3 }).step).toBe(1);
  });
});

describe("tripDraftReducer — identidade", () => {
  it("'setName' grava o nome e respeita o limite de 80", () => {
    expect(run({ type: "setName", name: "Costa Leste" }).name).toBe("Costa Leste");
    expect(run({ type: "setName", name: "x".repeat(120) }).name).toHaveLength(80);
  });

  it("'setDescription' grava e respeita o limite de 220", () => {
    expect(run({ type: "setDescription", description: "Roteiro" }).description).toBe("Roteiro");
    expect(run({ type: "setDescription", description: "y".repeat(300) }).description).toHaveLength(
      220,
    );
  });

  it("'setDeparture' grava a partida aproximada", () => {
    expect(run({ type: "setDeparture", date: "2026-07-01" }).departureDate).toBe("2026-07-01");
    expect(run({ type: "setDeparture", date: null }).departureDate).toBeNull();
  });
});

describe("tripDraftReducer — destino", () => {
  it("'setDestination' grava cidade e país na última parada", () => {
    // when
    const draft = run({ type: "setDestination", city: "Nova York", country: "US" });
    // then
    expect(getDestination(draft).city).toBe("Nova York");
    expect(getDestination(draft).country).toBe("US");
  });

  it("destino continua sendo a última parada após inserir intermediárias", () => {
    // when
    const draft = run({ type: "setDestination", city: "Roma", country: "IT" }, { type: "addStop" });
    // then
    expect(getDestination(draft).city).toBe("Roma");
    expect(draft.stops).toHaveLength(2);
  });
});

describe("tripDraftReducer — paradas (rota)", () => {
  it("'addStop' insere intermediária antes do destino", () => {
    // given
    const draft = run({ type: "setDestination", city: "Lisboa", country: "PT" });
    // when
    const next = tripDraftReducer(draft, { type: "addStop" });
    // then
    expect(next.stops).toHaveLength(2);
    expect(getDestination(next).city).toBe("Lisboa");
    expect(getMiddleStops(next)).toHaveLength(1);
  });

  it("'addStop' com índice 0 insere logo após a origem", () => {
    // given: destino + uma parada
    const draft = run({ type: "setDestination", city: "Fim", country: null }, { type: "addStop" });
    const firstId = draft.stops[0].id;
    // when
    const next = tripDraftReducer(draft, { type: "addStop", index: 0 });
    // then: o novo card é o primeiro, o antigo primeiro escorrega
    expect(next.stops[1].id).toBe(firstId);
    expect(next.stops).toHaveLength(3);
  });

  it("a 1ª parada nunca carrega translado compartilhado (null), demais nascem undecided", () => {
    // when
    const draft = run({ type: "addStop" }, { type: "addStop" });
    // then
    expect(draft.stops[0].desiredTransfer).toBeNull();
    for (const stop of draft.stops.slice(1)) {
      expect(stop.desiredTransfer).toEqual({ kind: "undecided" });
    }
  });

  it("'removeStop' remove a parada do meio e mantém invariante do índice 0", () => {
    // given: 3 paradas
    const draft = run({ type: "addStop" }, { type: "addStop" });
    const middleId = draft.stops[0].id;
    // when
    const next = tripDraftReducer(draft, { type: "removeStop", id: middleId });
    // then
    expect(next.stops).toHaveLength(2);
    expect(next.stops.some((s) => s.id === middleId)).toBe(false);
    expect(next.stops[0].desiredTransfer).toBeNull();
  });

  it("'removeStop' não esvazia a rota (mantém ao menos o destino)", () => {
    // given: só o destino
    const draft = createInitialDraft();
    // when
    const next = tripDraftReducer(draft, { type: "removeStop", id: draft.stops[0].id });
    // then
    expect(next.stops).toHaveLength(1);
  });

  it("'moveStop' reordena paradas do meio e renormaliza o translado do novo índice 0", () => {
    // given: 3 paradas; marca a 2ª (índice 1) com avião
    let draft = run({ type: "addStop" }, { type: "addStop" });
    const secondId = draft.stops[1].id;
    draft = tripDraftReducer(draft, {
      type: "setStopTransfer",
      id: secondId,
      transfer: { kind: "plane" },
    });
    // when: sobe a 2ª para o topo
    const next = tripDraftReducer(draft, { type: "moveStop", id: secondId, direction: "up" });
    // then: ela vira índice 0 e perde o salto compartilhado
    expect(next.stops[0].id).toBe(secondId);
    expect(next.stops[0].desiredTransfer).toBeNull();
  });

  it("'moveStop' não move o destino (última parada fixa)", () => {
    // given: 2 paradas (1 meio + destino)
    const draft = run({ type: "addStop" });
    const destId = getDestination(draft).id;
    // when: tenta descer o destino
    const next = tripDraftReducer(draft, { type: "moveStop", id: destId, direction: "down" });
    // then: ordem inalterada
    expect(next.stops.map((s) => s.id)).toEqual(draft.stops.map((s) => s.id));
  });

  it("'moveStop' para fora da faixa de paradas do meio é no-op", () => {
    // given: 2 paradas
    const draft = run({ type: "addStop" });
    const firstId = draft.stops[0].id;
    // when: tenta subir o primeiro (já no topo)
    const next = tripDraftReducer(draft, { type: "moveStop", id: firstId, direction: "up" });
    // then
    expect(next.stops.map((s) => s.id)).toEqual(draft.stops.map((s) => s.id));
  });

  it("'setStopLocation' grava cidade/país de uma parada do meio sem tocar o destino", () => {
    // given: destino "Roma" + uma parada do meio em branco
    const draft = run(
      { type: "setDestination", city: "Roma", country: "IT" },
      { type: "addStop", index: 0 },
    );
    const middleId = getMiddleStops(draft)[0].id;
    // when: edita a parada do meio por id
    const next = tripDraftReducer(draft, {
      type: "setStopLocation",
      id: middleId,
      city: "Florença",
      country: "IT",
    });
    // then: a do meio recebe a cidade; o destino fica intacto (não é privilegiado pela ação)
    expect(getMiddleStops(next)[0].city).toBe("Florença");
    expect(getMiddleStops(next)[0].country).toBe("IT");
    expect(getDestination(next).city).toBe("Roma");
  });

  it("'setStopLocation' edita o próprio destino quando recebe o id dele", () => {
    // given: destino + parada do meio
    const draft = run({ type: "setDestination", city: "Roma", country: "IT" }, { type: "addStop" });
    const destId = getDestination(draft).id;
    // when
    const next = tripDraftReducer(draft, {
      type: "setStopLocation",
      id: destId,
      city: "Nápoles",
      country: "IT",
    });
    // then
    expect(getDestination(next).city).toBe("Nápoles");
  });

  it("'setStopDate' grava a chegada aproximada da parada", () => {
    // given
    const draft = createInitialDraft();
    // when
    const next = tripDraftReducer(draft, {
      type: "setStopDate",
      id: draft.stops[0].id,
      date: "2026-07-10",
    });
    // then
    expect(next.stops[0].arrivalDate).toBe("2026-07-10");
  });
});

describe("tripDraftReducer — translados", () => {
  it("'setStopTransfer' define o salto compartilhado de uma parada não-primeira", () => {
    // given: 2 paradas
    const draft = run({ type: "addStop" });
    const destId = getDestination(draft).id;
    // when
    const next = tripDraftReducer(draft, {
      type: "setStopTransfer",
      id: destId,
      transfer: { kind: "train" },
    });
    // then
    expect(getDestination(next).desiredTransfer).toEqual({ kind: "train" });
  });

  it("'setStopTransfer' na 1ª parada é ignorado (salto pessoal, não compartilhado)", () => {
    // given: 2 paradas
    const draft = run({ type: "addStop" });
    const firstId = draft.stops[0].id;
    // when
    const next = tripDraftReducer(draft, {
      type: "setStopTransfer",
      id: firstId,
      transfer: { kind: "bus" },
    });
    // then
    expect(next.stops[0].desiredTransfer).toBeNull();
  });

  it("'setEntryTransfer' grava a ida pessoal do criador", () => {
    // when
    const draft = run({ type: "setEntryTransfer", transfer: { kind: "plane" } });
    // then
    expect(draft.entryTransfer).toEqual({ kind: "plane" });
  });
});

describe("tripDraftReducer — tripulação (convites)", () => {
  it("'addInvite' normaliza e-mail (lowercase/trim) com papel default member", () => {
    // when
    const draft = run({ type: "addInvite", email: "  Ana@Exemplo.COM " });
    // then
    expect(draft.invitations).toEqual([{ email: "ana@exemplo.com", role: "member" }]);
  });

  it("'addInvite' dedupe e-mail repetido (case-insensitive)", () => {
    // when
    const draft = run(
      { type: "addInvite", email: "ana@x.com" },
      { type: "addInvite", email: "ANA@X.COM" },
    );
    // then
    expect(draft.invitations).toHaveLength(1);
  });

  it("'addInvite' ignora e-mail vazio", () => {
    expect(run({ type: "addInvite", email: "   " }).invitations).toEqual([]);
  });

  it("'addInvite' aceita papel organizador explícito", () => {
    const draft = run({ type: "addInvite", email: "b@x.com", role: "organizer" });
    expect(draft.invitations[0].role).toBe("organizer");
  });

  it("'setInviteRole' alterna o papel de um convite (toggle Membro/Organizador)", () => {
    // given
    const draft = run({ type: "addInvite", email: "c@x.com" });
    // when
    const next = tripDraftReducer(draft, {
      type: "setInviteRole",
      email: "C@X.com",
      role: "organizer",
    });
    // then
    expect(next.invitations[0].role).toBe("organizer");
  });

  it("'removeInvite' remove o convite pelo e-mail", () => {
    // given
    const draft = run(
      { type: "addInvite", email: "a@x.com" },
      { type: "addInvite", email: "b@x.com" },
    );
    // when
    const next = tripDraftReducer(draft, { type: "removeInvite", email: "A@X.com" });
    // then
    expect(next.invitations.map((i) => i.email)).toEqual(["b@x.com"]);
  });
});

describe("tripDraftReducer — reset e replace", () => {
  it("'reset' volta ao rascunho inicial", () => {
    // given
    const draft = run({ type: "setName", name: "X" }, { type: "next" }, { type: "addStop" });
    // when
    const next = tripDraftReducer(draft, { type: "reset" });
    // then
    expect(next).toEqual(expect.objectContaining({ step: 1, name: "", invitations: [] }));
    expect(next.stops).toHaveLength(1);
  });

  it("'replace' hidrata o rascunho renormalizando paradas", () => {
    // given: rascunho cru com translado indevido no índice 0
    const raw: TripDraft = {
      step: 3,
      name: "Antigo",
      description: "",
      departureDate: null,
      entryTransfer: null,
      stops: [
        {
          id: "a",
          city: "A",
          country: null,
          arrivalDate: null,
          desiredTransfer: { kind: "plane" },
        },
        { id: "b", city: "B", country: null, arrivalDate: null, desiredTransfer: null },
      ],
      invitations: [],
    };
    // when
    const next = tripDraftReducer(createInitialDraft(), { type: "replace", draft: raw });
    // then
    expect(next.stops[0].desiredTransfer).toBeNull();
    expect(next.stops[1].desiredTransfer).toEqual({ kind: "undecided" });
    expect(next.step).toBe(3);
  });
});

describe("canSubmit", () => {
  it("exige nome e cidade de destino", () => {
    expect(canSubmit(createInitialDraft())).toBe(false);
    const ok = run(
      { type: "setName", name: "Viagem" },
      { type: "setDestination", city: "Roma", country: "IT" },
    );
    expect(canSubmit(ok)).toBe(true);
  });
});

describe("draftToPayload", () => {
  it("mapeia o rascunho para o corpo de POST /trips no formato congelado", () => {
    // given
    const draft = run(
      { type: "setName", name: "  Costa Leste  " },
      { type: "setDescription", description: "  road trip  " },
      { type: "setDeparture", date: "2026-07-01" },
      { type: "setDestination", city: "  Nova York  ", country: "US" },
      { type: "addStop", index: 0 },
      { type: "setEntryTransfer", transfer: { kind: "plane" } },
      { type: "addInvite", email: "Ana@X.com", role: "organizer" },
    );
    const firstId = draft.stops[0].id;
    const destId = getDestination(draft).id;
    const withTransfers = [
      { type: "setDestination" as const, city: "Nova York", country: "US" },
      { type: "setStopTransfer" as const, id: destId, transfer: { kind: "rental_car" as const } },
      { type: "setStopDate" as const, id: firstId, date: "2026-07-05" },
    ].reduce(tripDraftReducer, draft);

    // when
    const payload = draftToPayload(withTransfers);

    // then
    expect(payload.name).toBe("Costa Leste");
    expect(payload.description).toBe("road trip");
    expect(payload.departure_date).toBe("2026-07-01");
    expect(payload.entry_transfer).toEqual({ kind: "plane", other_text: null });
    expect(payload.stops).toHaveLength(2);
    expect(payload.stops[0].desired_transfer).toBeNull();
    expect(payload.stops[0].city).toBe(""); // intermediária inserida em branco
    expect(payload.stops[1]).toEqual({
      city: "Nova York",
      country: "US",
      arrival_date: null,
      desired_transfer: { kind: "rental_car", other_text: null },
    });
    expect(payload.invitations).toEqual([{ email: "ana@x.com", role: "organizer" }]);
  });

  it("força stops[0].desired_transfer a null mesmo se o rascunho trouxer outro valor", () => {
    // given: rascunho cru via replace (índice 0 com avião)
    const raw: TripDraft = {
      step: 1,
      name: "T",
      description: "",
      departureDate: null,
      entryTransfer: null,
      stops: [
        {
          id: "a",
          city: "A",
          country: null,
          arrivalDate: null,
          desiredTransfer: { kind: "plane" },
        },
        { id: "b", city: "B", country: null, arrivalDate: null, desiredTransfer: { kind: "bus" } },
      ],
      invitations: [],
    };
    // when
    const payload = draftToPayload(raw);
    // then
    expect(payload.stops[0].desired_transfer).toBeNull();
    expect(payload.stops[1].desired_transfer).toEqual({ kind: "bus", other_text: null });
  });

  it("descrição vazia vira null", () => {
    const payload = draftToPayload(run({ type: "setName", name: "T" }));
    expect(payload.description).toBeNull();
  });

  it("translado 'other' carrega o texto livre; 'other' sem texto vira null", () => {
    const draft = run({
      type: "setEntryTransfer",
      transfer: { kind: "other", otherText: "  Carona  " },
    });
    expect(draftToPayload(draft).entry_transfer).toEqual({ kind: "other", other_text: "Carona" });

    const empty = run({ type: "setEntryTransfer", transfer: { kind: "other", otherText: "  " } });
    expect(draftToPayload(empty).entry_transfer).toEqual({ kind: "other", other_text: null });
  });
});

describe("localStorage helpers", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("saveDraft + loadDraft faz round-trip pela chave versionada", () => {
    // given
    const draft = run({ type: "setName", name: "Persistida" }, { type: "addStop" });
    // when
    saveDraft(draft);
    const loaded = loadDraft();
    // then
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(loaded?.name).toBe("Persistida");
    expect(loaded?.stops).toHaveLength(2);
  });

  it("loadDraft devolve null quando não há rascunho", () => {
    expect(loadDraft()).toBeNull();
  });

  it("loadDraft devolve null e não quebra com JSON corrompido", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ não é json");
    expect(loadDraft()).toBeNull();
  });

  it("loadDraft renormaliza paradas hidratadas", () => {
    // given: índice 0 salvo com translado indevido
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step: 2,
        name: "X",
        description: "",
        departureDate: null,
        entryTransfer: null,
        stops: [
          {
            id: "a",
            city: "A",
            country: null,
            arrivalDate: null,
            desiredTransfer: { kind: "plane" },
          },
        ],
        invitations: [],
      }),
    );
    // then
    expect(loadDraft()?.stops[0].desiredTransfer).toBeNull();
  });

  it("clearDraft apaga o rascunho", () => {
    saveDraft(createInitialDraft());
    clearDraft();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
