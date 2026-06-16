"use client";

import type { CommentWithAuthor, MembershipRole } from "@traveltogether/types";
import { useEffect, useState } from "react";

import {
  createCommentAction,
  deleteCommentAction,
  getTripCommentsAction,
  updateCommentAction,
} from "@/app/actions/comments";
import { Icon, UserAvatar } from "@/components/atlas";
import { anchorLabel, isAnchored } from "@/lib/comments/mural";
import { canDeleteComment, canEditComment, isBlankBody } from "@/lib/comments/policy";

interface Props {
  tripId: string;
  currentUserId: string;
  role: MembershipRole;
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MuralThread({ tripId, currentUserId, role }: Props) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    let active = true;
    getTripCommentsAction(tripId).then((list) => {
      if (active) {
        setComments(list);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [tripId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (isBlankBody(draft)) return;
    setBusy(true);
    // O mural posta sempre no alvo Viagem; ancorados vêm do contexto do alvo.
    const created = await createCommentAction(tripId, {
      target_type: "trip",
      target_id: tripId,
      body: draft,
    });
    if (created) {
      const refreshed = await getTripCommentsAction(tripId);
      setComments(refreshed);
      setDraft("");
    }
    setBusy(false);
  }

  async function handleSaveEdit(commentId: string) {
    if (isBlankBody(editBody)) return;
    setBusy(true);
    const updated = await updateCommentAction(commentId, editBody);
    if (updated) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, body: updated.body, updated_at: updated.updated_at } : c,
        ),
      );
      setEditing(null);
    }
    setBusy(false);
  }

  async function handleDelete(commentId: string) {
    setBusy(true);
    const ok = await deleteCommentAction(commentId);
    if (ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {comments.map((comment) => {
          const anchored = isAnchored(comment.target_type);
          const pill = anchorLabel(comment.target_type);
          // Ancorados são read-only no mural: edita/apaga no contexto do alvo.
          const perm = { authorId: comment.author_id, userId: currentUserId, role };
          const showEdit = !anchored && canEditComment(perm);
          const showDelete = !anchored && canDeleteComment(perm);
          return (
            <div key={comment.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <UserAvatar
                avatarUrl={comment.author_avatar_url}
                label={comment.author_display_name ?? "Membro"}
                seed={comment.author_id}
                size={26}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    marginBottom: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>
                    {comment.author_display_name ?? "Membro"} · {formatWhen(comment.created_at)}
                    {comment.updated_at !== comment.created_at && " · editado"}
                  </span>
                  {pill && (
                    <span className="chip outline" style={{ fontSize: 10 }}>
                      <Icon name="pin" size={10} /> {pill}
                    </span>
                  )}
                </div>
                {editing === comment.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      onChange={(e) => setEditBody(e.target.value)}
                      style={{ flex: 1 }}
                      value={editBody}
                    />
                    <button
                      className="btn tiny accent"
                      disabled={busy}
                      onClick={() => handleSaveEdit(comment.id)}
                      type="button"
                    >
                      Salvar
                    </button>
                    <button
                      className="btn tiny ghost"
                      onClick={() => setEditing(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, color: "var(--ink-soft)", textWrap: "pretty" }}>
                    {comment.body}
                  </div>
                )}
              </div>
              {editing !== comment.id && (showEdit || showDelete) && (
                <div style={{ display: "flex", gap: 2 }}>
                  {showEdit && (
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setEditing(comment.id);
                        setEditBody(comment.body);
                      }}
                      title="Editar"
                      type="button"
                    >
                      <Icon name="edit" size={12} />
                    </button>
                  )}
                  {showDelete && (
                    <button
                      className="icon-btn"
                      disabled={busy}
                      onClick={() => handleDelete(comment.id)}
                      title="Excluir"
                      type="button"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {loaded && comments.length === 0 && (
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            Nenhum recado ainda. Abra a conversa do grupo.
          </div>
        )}
      </div>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escrever no mural…"
          style={{ flex: 1 }}
          value={draft}
        />
        <button className="btn small accent" disabled={busy || isBlankBody(draft)} type="submit">
          Enviar
        </button>
      </form>
    </div>
  );
}
