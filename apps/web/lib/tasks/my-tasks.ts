import type { TaskStatus, TaskWithAssignees, TripSummary } from "@traveltogether/types";

import { BOARD_COLUMNS, groupByStatus } from "./board";

// Tarefa enriquecida com o nome da Viagem a que pertence (a tela global agrega
// Tarefas de várias Viagens; o DTO só traz trip_id, então resolvemos o nome aqui).
export interface MyTask extends TaskWithAssignees {
  trip_name: string;
}

export interface MyTasksColumn {
  status: TaskStatus;
  label: string;
  tasks: MyTask[];
}

export interface MyTasksView {
  count: number;
  columns: MyTasksColumn[];
}

// Agrega as Tarefas em que o usuário é Responsável num board kanban global,
// resolvendo o nome da Viagem de cada Tarefa a partir da lista de Viagens.
export function buildMyTasksView(tasks: TaskWithAssignees[], trips: TripSummary[]): MyTasksView {
  const tripName = new Map(trips.map((t) => [t.trip.id, t.trip.name]));
  const enriched: MyTask[] = tasks.map((task) => ({
    ...task,
    trip_name: tripName.get(task.trip_id) ?? "Viagem",
  }));
  const groups = groupByStatus(enriched);
  return {
    count: enriched.length,
    columns: BOARD_COLUMNS.map((col) => ({
      status: col.status,
      label: col.label,
      tasks: groups[col.status] as MyTask[],
    })),
  };
}
