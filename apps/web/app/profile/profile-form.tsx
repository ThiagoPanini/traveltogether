"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { UserAvatar } from "@/components/atlas";
import type { CurrentUser } from "@/lib/api/current-user";
import { displayLabel } from "@/lib/identity/user-display";

import { updateProfileAction } from "./actions";

export function ProfileForm({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const label = displayLabel({ display_name: displayName || null, email: user.email });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("saving");
    const result = await updateProfileAction({
      display_name: displayName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });
    if (result) {
      setState("saved");
      router.refresh();
    } else {
      setState("error");
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 26 }}>
        <UserAvatar avatarUrl={avatarUrl || null} label={label} seed={user.id} size={64} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{label}</div>
          <div className="mono-num" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            {user.email}
          </div>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Nome de exibição</span>
          <input
            maxLength={80}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Como o grupo te vê"
            value={displayName}
          />
        </label>
        <label className="field">
          <span>URL do avatar (opcional)</span>
          <input
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://… — em branco usa o grafismo topográfico"
            type="url"
            value={avatarUrl}
          />
        </label>
      </div>

      <div className="form-actions" style={{ marginTop: 22, alignItems: "center", gap: 14 }}>
        {state === "saved" && (
          <span className="hint" role="status" style={{ color: "var(--ok)" }}>
            Perfil salvo.
          </span>
        )}
        {state === "error" && (
          <span className="hint" role="status" style={{ color: "var(--danger)" }}>
            Não foi possível salvar.
          </span>
        )}
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn accent" disabled={state === "saving"} type="submit">
          {state === "saving" ? "Salvando…" : "Salvar perfil"}
        </button>
      </div>
    </form>
  );
}
