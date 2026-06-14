"use client";

import type { CommentTargetType, CommentWithAuthor, MembershipRole } from "@traveltogether/types";
import { useEffect, useState } from "react";

import { Icon, UserAvatar } from "@/components/atlas";
import { canDeleteComment, canEditComment, isBlankBody } from "@/lib/comments/policy";
import {
  createCommentAction,
  deleteCommentAction,
  getCommentsAction,
  updateCommentAction,
} from "./actions";

interface Props {
  tripId: string;
  targetType: CommentTargetType;
  targetId: string;
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

export default function CommentThread({
  tripId,
  targetType,
  targetId,
  currentUserId,
  role,
}: Props) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    let active = true;
    getCommentsAction(tripId, targetType, targetId).then((list) => {
      if (active) {
        setComments(list);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [tripId, targetType, targetId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (isBlankBody(draft)) return;
    setBusy(true);
    const created = await createCommentAction(tripId, {
      target_type: targetType,
      target_id: targetId,
      body: draft,
    });
    if (created) {
      const refreshed = await getCommentsAction(tripId, targetType, targetId);
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
    <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <div
        className="kicker"
        style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}
      >
        <Icon name="message" size={12} /> comentários
        {loaded && comments.length > 0 && <span className="mono-num">· {comments.length}</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {comments.map((comment) => {
          const perm = { authorId: comment.author_id, userId: currentUserId, role };
          return (
            <div key={comment.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <UserAvatar
                avatarUrl={comment.author_avatar_url}
                label={comment.author_display_name ?? "Membro"}
                seed={comment.author_id}
                size={24}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}
                >
                  {comment.author_display_name ?? "Membro"} · {formatWhen(comment.created_at)}
                  {comment.updated_at !== comment.created_at && " · editado"}
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
              {editing !== comment.id && (
                <div style={{ display: "flex", gap: 2 }}>
                  {canEditComment(perm) && (
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
                  {canDeleteComment(perm) && (
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
            Nenhum comentário ainda. Abra a discussão.
          </div>
        )}
      </div>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Comentar nesta pesquisa…"
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
