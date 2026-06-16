import type { TaskWithAssignees, TripSummary } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { buildMyTasksView } from "./my-tasks";

function task(over: Partial<TaskWithAssignees> & { id: string }): TaskWithAssignees {
  return {
    trip_id: "t1",
    title: "Tarefa",
    description: "",
    due_date: null,
    status: "todo",
    anchor_type: null,
    anchor_id: null,
    created_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    assignee_ids: [],
    assignees: [],
    ...over,
  };
}

function trip(id: string, name: string): TripSummary {
  return {
    trip: {
      id,
      name,
      origin: "São Paulo",
      airport_code: "GRU",
      start_date: null,
      end_date: null,
      created_by: "u1",
      created_at: "2026-01-01T00:00:00Z",
    } as TripSummary["trip"],
    role: "member",
    stops: [],
    legs: [],
  } as unknown as TripSummary;
}

describe("buildMyTasksView", () => {
  it("sem tarefas: count 0 e três colunas vazias na ordem do board", () => {
    const view = buildMyTasksView([], []);
    expect(view.count).toBe(0);
    expect(view.columns.map((c) => c.label)).toEqual(["A fazer", "Fazendo", "Feito"]);
    expect(view.columns.every((c) => c.tasks.length === 0)).toBe(true);
  });

  it("resolve o nome da Viagem de cada Tarefa pelo trip_id", () => {
    const view = buildMyTasksView(
      [task({ id: "a", trip_id: "t1" }), task({ id: "b", trip_id: "t2" })],
      [trip("t1", "Chile 2026"), trip("t2", "Bariloche")],
    );
    const todo = view.columns[0].tasks;
    expect(todo.map((t) => t.trip_name)).toEqual(["Chile 2026", "Bariloche"]);
  });

  it("Tarefa de Viagem desconhecida cai num rótulo neutro", () => {
    const view = buildMyTasksView([task({ id: "a", trip_id: "sumiu" })], []);
    expect(view.columns[0].tasks[0].trip_name).toBe("Viagem");
  });

  it("distribui as Tarefas nas colunas por status", () => {
    const view = buildMyTasksView(
      [
        task({ id: "a", status: "todo" }),
        task({ id: "b", status: "done" }),
        task({ id: "c", status: "doing" }),
        task({ id: "d", status: "done" }),
      ],
      [],
    );
    expect(view.count).toBe(4);
    expect(view.columns[0].tasks.map((t) => t.id)).toEqual(["a"]);
    expect(view.columns[1].tasks.map((t) => t.id)).toEqual(["c"]);
    expect(view.columns[2].tasks.map((t) => t.id)).toEqual(["b", "d"]);
  });
});
