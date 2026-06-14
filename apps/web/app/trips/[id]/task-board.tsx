"use client";

import type {
  MembershipRole,
  StopPublic,
  TaskStatus,
  TaskWithAssignees,
} from "@traveltogether/types";
import { useMemo, useState } from "react";
import { createTaskAction, deleteTaskAction, setTaskStatusAction } from "@/app/actions/tasks";
import { Icon, UserAvatar } from "@/components/atlas";
import { applyStatus, BOARD_COLUMNS, groupByStatus } from "@/lib/tasks/board";

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  tripId: string;
  currentUserId: string;
  role: MembershipRole;
  initialTasks: TaskWithAssignees[];
  members: Member[];
  stops: StopPublic[];
}

export default function TaskBoard({
  tripId,
  currentUserId,
  role,
  initialTasks,
  members,
  stops,
}: Props) {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [anchorStop, setAnchorStop] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const isOrganizer = role === "organizer";
  const grouped = useMemo(() => groupByStatus(tasks), [tasks]);
  const stopLabel = useMemo(() => Object.fromEntries(stops.map((s) => [s.id, s.city])), [stops]);

  function canMove(task: TaskWithAssignees): boolean {
    return isOrganizer || task.assignee_ids.includes(currentUserId);
  }

  function toggleAssignee(userId: string) {
    setAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const created = await createTaskAction(tripId, {
      title: title.trim(),
      due_date: dueDate || null,
      assignee_ids: assignees,
      anchor_type: anchorStop ? "stop" : null,
      anchor_id: anchorStop || null,
    });
    if (created) {
      setTasks((prev) => [...prev, created]);
      setTitle("");
      setDueDate("");
      setAssignees([]);
      setAnchorStop("");
      setShowForm(false);
    }
    setBusy(false);
  }

  async function moveTo(task: TaskWithAssignees, status: TaskStatus) {
    if (task.status === status || !canMove(task)) return;
    setTasks((prev) => applyStatus(prev, task.id, status));
    const updated = await setTaskStatusAction(task.id, status);
    if (!updated) {
      // rollback em caso de falha (ex.: permissão)
      setTasks((prev) => applyStatus(prev, task.id, task.status));
    }
  }

  async function handleDelete(taskId: string) {
    setBusy(true);
    const ok = await deleteTaskAction(taskId);
    if (ok) setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setBusy(false);
  }

  return (
    <div>
      <div className="section-head" style={{ marginTop: 40 }}>
        <span className="kicker">tarefas</span>
        <h2>Board do grupo</h2>
        <span className="spacer" />
        {isOrganizer && (
          <button className="btn small accent" onClick={() => setShowForm((v) => !v)} type="button">
            <Icon name="plus" size={13} /> Nova tarefa
          </button>
        )}
      </div>

      {showForm && isOrganizer && (
        <form
          className="card flat"
          onSubmit={handleCreate}
          style={{ border: "1.5px dashed var(--line)", padding: "18px 20px", marginBottom: 18 }}
        >
          <div className="form-grid" style={{ gap: 12 }}>
            <div className="form-row cols-2">
              <label className="field">
                <span>Tarefa</span>
                <input
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Reservar hotel em Lisboa"
                  required
                  value={title}
                />
              </label>
              <label className="field">
                <span>Prazo (opcional)</span>
                <input onChange={(e) => setDueDate(e.target.value)} type="date" value={dueDate} />
              </label>
            </div>
            {stops.length > 0 && (
              <label className="field">
                <span>Âncora (opcional)</span>
                <select onChange={(e) => setAnchorStop(e.target.value)} value={anchorStop}>
                  <option value="">Sem âncora</option>
                  {stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      Parada · {s.city}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="field">
              <span>Responsáveis</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {members.map((m) => {
                  const on = assignees.includes(m.user_id);
                  return (
                    <button
                      className={`chip ${on ? "" : "outline"}`}
                      key={m.user_id}
                      onClick={() => toggleAssignee(m.user_id)}
                      type="button"
                    >
                      {m.display_name ?? "Membro"}
                    </button>
                  );
                })}
                {members.length === 0 && (
                  <span className="soft" style={{ fontSize: 12.5 }}>
                    Convide pessoas para atribuir responsáveis.
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 14 }}>
            <button className="btn small ghost" onClick={() => setShowForm(false)} type="button">
              Cancelar
            </button>
            <button className="btn small accent" disabled={busy} type="submit">
              Criar tarefa
            </button>
          </div>
        </form>
      )}

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
              {grouped[col.status].map((task) => {
                const movable = canMove(task);
                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: card arrastável do board (DnD nativo)
                  <div
                    className="kanban-card"
                    draggable={movable}
                    key={task.id}
                    onDragEnd={() => setDragId(null)}
                    onDragStart={() => setDragId(task.id)}
                    style={{ cursor: movable ? "grab" : "default" }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, textWrap: "pretty" }}>
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
                      {task.anchor_type === "stop" &&
                        task.anchor_id &&
                        stopLabel[task.anchor_id] && (
                          <span className="chip outline" style={{ fontSize: 10.5 }}>
                            <Icon name="pin" size={10} /> {stopLabel[task.anchor_id]}
                          </span>
                        )}
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
                      <div style={{ display: "flex", marginRight: isOrganizer ? 2 : 0 }}>
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
                      {isOrganizer && (
                        <button
                          className="icon-btn"
                          disabled={busy}
                          onClick={() => handleDelete(task.id)}
                          title="Excluir tarefa"
                          type="button"
                        >
                          <Icon name="trash" size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {grouped[col.status].length === 0 && (
                <div className="soft" style={{ fontSize: 12, padding: "8px 2px" }}>
                  —
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
