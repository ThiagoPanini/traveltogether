import type { TaskStatus, TaskWithAssignees } from "@traveltogether/types";

export const BOARD_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "A fazer" },
  { status: "doing", label: "Fazendo" },
  { status: "done", label: "Feito" },
];

// Agrupa Tarefas por status, preservando a ordem de entrada em cada coluna.
export function groupByStatus(tasks: TaskWithAssignees[]): Record<TaskStatus, TaskWithAssignees[]> {
  const groups: Record<TaskStatus, TaskWithAssignees[]> = { todo: [], doing: [], done: [] };
  for (const task of tasks) groups[task.status].push(task);
  return groups;
}

// Aplica uma mudança de status localmente (otimista), retornando nova lista.
export function applyStatus(
  tasks: TaskWithAssignees[],
  taskId: string,
  status: TaskStatus,
): TaskWithAssignees[] {
  return tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
}
