"use client";

import type {
  MemberWithUser,
  NetworkSuggestionItem,
  PendingMembershipPublic,
  UserPublic,
} from "@traveltogether/types";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Icon, UserAvatar } from "@/components/atlas";
import { displayLabel } from "@/lib/identity/user-display";
import {
  addMemberAction,
  removeMemberAction,
  suggestMembersAction,
  updateMemberRoleAction,
} from "./actions";

interface Props {
  tripId: string;
  members: MemberWithUser[];
  pending: PendingMembershipPublic[];
  isOrganizer: boolean;
}

export function MembersPanel({ tripId, members, pending, isOrganizer }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [addState, setAddState] = useState<"idle" | "submitting" | "error" | "ok">("idle");
  const [addMsg, setAddMsg] = useState("");
  const [addedUser, setAddedUser] = useState<UserPublic | null>(null);

  const [suggestions, setSuggestions] = useState<NetworkSuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const organizerCount = members.filter((m) => m.membership.role === "organizer").length;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onEmailChange(value: string) {
    setEmail(value);
    setAddState("idle");
    setAddMsg("");
    setAddedUser(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await suggestMembersAction(tripId, value);
      if (res && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);
  }

  function selectSuggestion(s: NetworkSuggestionItem) {
    setEmail(s.email);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  async function onAddMember(e: FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    setAddState("submitting");
    const result = await addMemberAction(tripId, email);
    if (result) {
      setEmail("");
      setAddState("ok");
      setAddedUser(result.existing_user ?? null);
      setAddMsg(
        result.pending
          ? `Convite enviado para ${email}.`
          : result.existing_user?.display_name
            ? `${result.existing_user.display_name} adicionado.`
            : `${email} adicionado.`,
      );
      router.refresh();
    } else {
      setAddState("error");
      setAddMsg("Não foi possível adicionar a pessoa.");
    }
  }

  async function onToggleRole(membershipId: string, role: "organizer" | "member") {
    await updateMemberRoleAction(
      tripId,
      membershipId,
      role === "organizer" ? "member" : "organizer",
    );
    router.refresh();
  }

  async function onRemove(membershipId: string) {
    await removeMemberAction(tripId, membershipId);
    router.refresh();
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="board">
          {members.map(({ membership, email: memberEmail, display_name, avatar_url }) => {
            const lastOrganizer = membership.role === "organizer" && organizerCount === 1;
            const label = displayLabel({ display_name, email: memberEmail });
            return (
              <div
                key={membership.id}
                className="board-row"
                style={{ gridTemplateColumns: "auto 1fr auto auto" }}
              >
                <UserAvatar avatarUrl={avatar_url} label={label} seed={membership.user_id} />
                <div>
                  <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{label}</div>
                  <div className="mono-num" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    {memberEmail}
                  </div>
                </div>
                <span className={`chip ${membership.role === "organizer" ? "green" : "outline"}`}>
                  {membership.role === "organizer" ? "organizador" : "membro"}
                </span>
                {isOrganizer ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn tiny ghost"
                      disabled={lastOrganizer}
                      onClick={() => onToggleRole(membership.id, membership.role)}
                      title={lastOrganizer ? "Toda viagem precisa de ao menos um organizador" : ""}
                      type="button"
                    >
                      {membership.role === "organizer" ? "Rebaixar" : "Promover"}
                    </button>
                    <button
                      className="icon-btn"
                      disabled={lastOrganizer}
                      onClick={() => onRemove(membership.id)}
                      title={
                        lastOrganizer
                          ? "Não é possível remover o último organizador"
                          : "Remover da viagem"
                      }
                      type="button"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 22 }}>
          <div className="board">
            {pending.map((p) => (
              <div
                key={p.id}
                className="board-row"
                style={{ gridTemplateColumns: "auto 1fr auto" }}
              >
                <span
                  className="avatar"
                  style={{ background: "var(--chip-bg)", color: "var(--ink-soft)" }}
                >
                  ?
                </span>
                <div className="mono-num" style={{ fontSize: 13 }}>
                  {p.email}
                </div>
                <span className="chip outline">pendente</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOrganizer && (
        <form
          className="card flat"
          onSubmit={onAddMember}
          style={{ border: "1.5px dashed var(--line)", padding: "20px 22px" }}
        >
          <div
            ref={wrapperRef}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "end",
              position: "relative",
            }}
          >
            <label className="field">
              <span>Adicionar pessoa por e-mail</span>
              <input
                autoComplete="off"
                onChange={(e) => onEmailChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="amigo@exemplo.com"
                required
                type="email"
                value={email}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    listStyle: "none",
                    margin: 0,
                    padding: "4px 0",
                    zIndex: 50,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                  }}
                >
                  {suggestions.map((s) => (
                    <li key={s.email}>
                      <button
                        onMouseDown={() => selectSuggestion(s)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          padding: "8px 12px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          color: "var(--ink)",
                        }}
                        type="button"
                      >
                        <UserAvatar
                          avatarUrl={s.avatar_url}
                          label={s.display_name ?? s.email}
                          seed={s.email}
                          size={24}
                        />
                        <div>
                          {s.display_name && (
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.display_name}</div>
                          )}
                          <div
                            className="mono-num"
                            style={{ fontSize: 11, color: "var(--ink-soft)" }}
                          >
                            {s.email}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </label>
            <button
              className="btn accent small"
              disabled={addState === "submitting" || !email.includes("@")}
              type="submit"
              style={{ height: 41 }}
            >
              <Icon name="plus" size={13} />{" "}
              {addState === "submitting" ? "Convidando…" : "Convidar"}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Digite o e-mail de quem você quer convidar. Novos membros entram com acesso de leitura e
            upvote.
          </p>
          {addMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              {addedUser && (
                <UserAvatar
                  avatarUrl={addedUser.avatar_url}
                  label={addedUser.display_name ?? addedUser.email}
                  seed={addedUser.id}
                  size={24}
                />
              )}
              <p
                className="hint"
                role="status"
                style={{ margin: 0, color: addState === "error" ? "var(--danger)" : "var(--ok)" }}
              >
                {addMsg}
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
