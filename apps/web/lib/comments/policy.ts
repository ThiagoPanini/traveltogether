import type { MembershipRole } from "@traveltogether/types";

interface CommentPermissionInput {
  authorId: string;
  userId: string;
  role: MembershipRole;
}

/** Só o autor edita o próprio Comentário (espelha o service da API). */
export function canEditComment({ authorId, userId }: CommentPermissionInput): boolean {
  return authorId === userId;
}

/** Apaga o Comentário: o autor sempre; o Organizador, qualquer um. */
export function canDeleteComment({ authorId, userId, role }: CommentPermissionInput): boolean {
  return authorId === userId || role === "organizer";
}

/** Corpo em branco (vazio ou só espaços) é rejeitado pela API. */
export function isBlankBody(body: string): boolean {
  return body.trim().length === 0;
}
