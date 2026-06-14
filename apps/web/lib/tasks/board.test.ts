import type { TaskWithAssignees } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { applyStatus, BOARD_COLUMNS, groupByStatus } from "./board";

function task(id: string, status: TaskWithAssignees["status"]): TaskWithAssignees {
  return {
    id,
    trip_id: "t",
    title: id,
    description: "",
    due_date: null,
    status,
    anchor_type: null,
    anchor_id: null,
    created_by: "u",
    created_at: "2026-06-14T00:00:00",
    updated_at: "2026-06-14T00:00:00",
    assignee_ids: [],
    assignees: [],
  };
}

describe("BOARD_COLUMNS", () => {
  it("tem três colunas na ordem a fazer/fazendo/feito", () => {
    expect(BOARD_COLUMNS.map((c) => c.status)).toEqual(["todo", "doing", "done"]);
  });
});

describe("groupByStatus", () => {
  it("agrupa preservando a ordem", () => {
    const groups = groupByStatus([task("a", "todo"), task("b", "done"), task("c", "todo")]);
    expect(groups.todo.map((t) => t.id)).toEqual(["a", "c"]);
    expect(groups.done.map((t) => t.id)).toEqual(["b"]);
    expect(groups.doing).toEqual([]);
  });
});

describe("applyStatus", () => {
  it("move só a tarefa alvo", () => {
    const result = applyStatus([task("a", "todo"), task("b", "todo")], "a", "doing");
    expect(result.find((t) => t.id === "a")?.status).toBe("doing");
    expect(result.find((t) => t.id === "b")?.status).toBe("todo");
  });
});
