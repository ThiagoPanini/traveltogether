import type { PendingActionPublic } from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

// "O que precisa de mim": pendências derivadas cross-Viagem (#58).
export async function getPendingActions(accessToken: string): Promise<PendingActionPublic[]> {
  try {
    const response = await fetch(`${apiUrl()}/me/pending-actions`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    return (await response.json()) as PendingActionPublic[];
  } catch {
    return [];
  }
}
