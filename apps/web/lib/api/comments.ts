import type {
  CommentCreate,
  CommentPublic,
  CommentTargetType,
  CommentUpdate,
  CommentWithAuthor,
} from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

export async function getComments(
  accessToken: string,
  tripId: string,
  targetType: CommentTargetType,
  targetId: string,
): Promise<CommentWithAuthor[]> {
  try {
    const params = new URLSearchParams({ target_type: targetType, target_id: targetId });
    const response = await fetch(`${apiUrl()}/trips/${tripId}/comments?${params}`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as CommentWithAuthor[];
  } catch {
    return [];
  }
}

export async function getTripComments(
  accessToken: string,
  tripId: string,
): Promise<CommentWithAuthor[]> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/comments/all`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return [];
    return (await response.json()) as CommentWithAuthor[];
  } catch {
    return [];
  }
}

export async function createComment(
  accessToken: string,
  tripId: string,
  data: CommentCreate,
): Promise<CommentPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/trips/${tripId}/comments`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as CommentPublic;
  } catch {
    return null;
  }
}

export async function updateComment(
  accessToken: string,
  commentId: string,
  data: CommentUpdate,
): Promise<CommentPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/comments/${commentId}`, {
      method: "PATCH",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as CommentPublic;
  } catch {
    return null;
  }
}

export async function deleteComment(accessToken: string, commentId: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/comments/${commentId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
