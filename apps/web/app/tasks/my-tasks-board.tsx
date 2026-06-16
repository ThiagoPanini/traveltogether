"use client";

import type { TaskStatus } from "@traveltogether/types";
import Link from "next/link";
import { useMemo, useState } from "react";

import { setTaskStatusAction } from "@/app/actions/tasks";
import { Icon, UserAvatar } from "@/components/atlas";
import { applyStatus, BOARD_COLUMNS, groupByStatus } from "@/lib/tasks/board";
import type { MyTask } from "@/lib/tasks/my-tasks";
import { tripTabHref } from "@/lib/trips/tabs";

interface Props {
  initialTasks: MyTask[];
}

// Board global das Tarefas em que sou Responsável, agregadas das minhas Viagens.
// Todas as Tarefas aqui são minhas (o endpoint /me/tasks só devolve essas), então
// posso movê-las todas. Criação continua sendo por Viagem; não há formulário aqui.
export default function MyTasksBoard({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<MyTask[]>(initialTasks);
  const [dragId, setDragId] = useState<string | null>(null);

  const grouped = useMemo(() => groupByStatus(tasks) as Record<TaskStatus, MyTask[]>, [tasks]);

  async function moveTo(task: MyTask, status: TaskStatus) {
    if (task.status === status) return;
    setTasks((prev) => applyStatus(prev, task.id, status) as MyTask[]);
    const updated = await setTaskStatusAction(task.id, status);
    if (!updated) setTasks((prev) => applyStatus(prev, task.id, task.status) as MyTask[]);
  }

  if (tasks.length === 0) {
    return (
      <div className="empty">
        <p>Nenhuma tarefa atribuída a você.</p>
        <p className="soft" style={{ fontSize: 14 }}>
          Quando um Organizador colocar você como Responsável numa tarefa, ela aparece aqui — de
          todas as suas Viagens, num só lugar.
        </p>
      </div>
    );
  }

  return (
    <div className="kanban">
      {BOARD_COLUMNS.map((col) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: coluna é zona de drop do board
        <div
          className="kanban-col"
          key={col.status}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            const task = tasks.find((t) => t.id === dragId);
            if (task) moveTo(task, col.status);
            setDragId(null);
          }}
        >
          <div className="kanban-col-head">
            <span className="kicker">{col.label}</span>
            <span className="mono-num soft">{grouped[col.status].length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {grouped[col.status].map((task) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: card arrastável do board (DnD nativo)
              <div
                className="kanban-card"
                draggable
                key={task.id}
                onDragEnd={() => setDragId(null)}
                onDragStart={() => setDragId(task.id)}
                style={{ cursor: "grab" }}
              >
                <Link
                  className="chip outline"
                  href={tripTabHref(task.trip_id, "tasks")}
                  style={{ fontSize: 10.5, textDecoration: "none", color: "inherit" }}
                >
                  <Icon name="compass" size={10} /> {task.trip_name}
                </Link>
                <div style={{ fontWeight: 600, fontSize: 14, textWrap: "pretty", marginTop: 8 }}>
                  {task.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {task.due_date && (
                    <span className="mono-num soft" style={{ fontSize: 10.5 }}>
                      <Icon name="calendar" size={10} />{" "}
                      {new Date(`${task.due_date}T00:00:00`).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  )}
                  <span className="spacer" style={{ flex: 1 }} />
                  <div style={{ display: "flex" }}>
                    {task.assignees.map((a) => (
                      <span key={a.user_id} style={{ marginLeft: -6 }}>
                        <UserAvatar
                          avatarUrl={a.avatar_url}
                          label={a.display_name ?? "Membro"}
                          seed={a.user_id}
                          size={20}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {grouped[col.status].length === 0 && (
              <div className="soft" style={{ fontSize: 12, padding: "8px 2px" }}>
                —
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
