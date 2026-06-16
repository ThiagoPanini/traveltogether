"use server";

import type { CommentCreate, CommentTargetType } from "@traveltogether/types";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import {
  createComment,
  deleteComment,
  getComments,
  getTripComments,
  updateComment,
} from "@/lib/api/comments";

export async function getCommentsAction(
  tripId: string,
  targetType: CommentTargetType,
  targetId: string,
) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return getComments(session.apiAccessToken, tripId, targetType, targetId);
}

export async function getTripCommentsAction(tripId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return getTripComments(session.apiAccessToken, tripId);
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
