"use server";

import type { MembershipRole } from "@traveltogether/types";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/auth";
import { addMember, getNetworkSuggestions, removeMember, updateMemberRole } from "@/lib/api/trips";

export async function addMemberAction(tripId: string, email: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return addMember(session.apiAccessToken, tripId, email);
}

export async function updateMemberRoleAction(
  tripId: string,
  membershipId: string,
  role: MembershipRole,
) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return updateMemberRole(session.apiAccessToken, tripId, membershipId, role);
}

export async function removeMemberAction(tripId: string, membershipId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return removeMember(session.apiAccessToken, tripId, membershipId);
}

export async function suggestMembersAction(tripId: string, q: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) return null;
  return getNetworkSuggestions(session.apiAccessToken, tripId, q);
}
