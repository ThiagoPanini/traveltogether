import type { InviteForUserPublic, MembershipPublic } from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

// Convites pendentes endereçados ao usuário (ADR-0015).
export async function getMyInvitations(accessToken: string): Promise<InviteForUserPublic[]> {
  try {
    const response = await fetch(`${apiUrl()}/me/invitations`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as InviteForUserPublic[];
  } catch {
    return [];
  }
}

// Aceitar materializa a Membership; idempotente.
export async function acceptInvitation(
  accessToken: string,
  invitationId: string,
): Promise<MembershipPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/me/invitations/${invitationId}/accept`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return null;
    return (await response.json()) as MembershipPublic;
  } catch {
    return null;
  }
}

// Recusar descarta o convite; idempotente.
export async function declineInvitation(
  accessToken: string,
  invitationId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/me/invitations/${invitationId}/decline`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
