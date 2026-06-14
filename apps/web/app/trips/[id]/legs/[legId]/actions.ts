"use server";

import type { FareQuoteCreate } from "@traveltogether/types";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/auth";
import { chooseFare, createFare, deleteFare, getUpvote, toggleUpvote } from "@/lib/api/fares";

export async function createFareAction(legId: string, data: FareQuoteCreate) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return createFare(session.apiAccessToken, legId, data);
}

export async function deleteFareAction(legId: string, fareId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return deleteFare(session.apiAccessToken, legId, fareId);
}

export async function getUpvoteAction(fareId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return getUpvote(session.apiAccessToken, fareId);
}

export async function toggleUpvoteAction(fareId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return toggleUpvote(session.apiAccessToken, fareId);
}

export async function chooseFareAction(legId: string, fareId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return chooseFare(session.apiAccessToken, legId, fareId);
}
