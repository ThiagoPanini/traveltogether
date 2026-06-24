"use server";

import { signOut } from "@/auth";
import { apiFetch } from "@/lib/bff/server";

/**
 * Logout (#193): revoga a sessão na API (kill no banco, via `POST /auth/logout`) e só
 * então limpa o cookie do Auth.js, voltando para o login. É Server Action — roda no
 * servidor, onde o token opaco da sessão ainda existe para autenticar a revogação. A
 * ordem importa: revoga enquanto o Bearer é válido, depois encerra a sessão local.
 */
export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
  await signOut({ redirectTo: "/entrar" });
}
