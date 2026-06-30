import type { ReactNode } from "react";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/bff/server";
import { AppShell, type ShellData, type ShellTrip } from "./app-shell";
import type { PendingInvitation } from "./pending-invitations";

type Me = {
  profile: {
    display_name?: string | null;
    origin_city?: string | null;
    country?: string | null;
  } | null;
};

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await apiFetch(path);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/** Layout autenticado: sidebar e barra mobile persistem em toda a área `/app/**`. */
export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const me = await fetchJson<Me | null>("/auth/me", null);
  const trips = await fetchJson<ShellTrip[]>("/trips", []);
  const invitations = await fetchJson<PendingInvitation[]>("/invitations", []);

  const displayName =
    me?.profile?.display_name?.trim() || session?.user?.name?.trim() || "viajante";
  const originCity = me?.profile?.origin_city?.trim() || "";
  const originCountry = me?.profile?.country?.trim() || "";
  const originLabel = originCity || "Origem";
  const originMeta = [originCity, originCountry].filter(Boolean).join(" · ") || "Origem a definir";

  const shell: ShellData = {
    user: {
      nameLabel: displayName,
      originLabel,
      originMeta,
      initial: displayName[0]?.toUpperCase() || "V",
    },
    trips,
    invitationCount: invitations.length,
  };

  return <AppShell shell={shell}>{children}</AppShell>;
}
