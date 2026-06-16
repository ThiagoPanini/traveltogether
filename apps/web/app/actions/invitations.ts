"use server";

import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { acceptInvitation, declineInvitation } from "@/lib/api/invitations";

export async function acceptInvitationAction(invitationId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return acceptInvitation(session.apiAccessToken, invitationId);
}

export async function declineInvitationAction(invitationId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return declineInvitation(session.apiAccessToken, invitationId);
}
