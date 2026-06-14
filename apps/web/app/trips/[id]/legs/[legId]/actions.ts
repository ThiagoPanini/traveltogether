"use server";

import type { CommentCreate, CommentTargetType, FareQuoteCreate } from "@traveltogether/types";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/auth";
import { createComment, deleteComment, getComments, updateComment } from "@/lib/api/comments";
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

export async function getCommentsAction(
  tripId: string,
  targetType: CommentTargetType,
  targetId: string,
) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return getComments(session.apiAccessToken, tripId, targetType, targetId);
}

export async function createCommentAction(tripId: string, data: CommentCreate) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return createComment(session.apiAccessToken, tripId, data);
}

export async function updateCommentAction(commentId: string, body: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return updateComment(session.apiAccessToken, commentId, { body });
}

export async function deleteCommentAction(commentId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return deleteComment(session.apiAccessToken, commentId);
}
