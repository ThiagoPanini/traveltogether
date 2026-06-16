import type { InviteForUserPublic } from "@traveltogether/types";

export interface InboxView {
  /** Quantidade de Convites pendentes endereçados ao usuário. */
  count: number;
  /** Resumo pt-BR ("1 convite pendente" / "N convites pendentes"). */
  headline: string;
  /** Convites do mais novo ao mais antigo. */
  items: InviteForUserPublic[];
}

/**
 * Monta a visão da inbox de Convites: ordena do mais recente ao mais antigo e
 * resume a contagem em pt-BR. Lógica pura — a superfície (banner) só renderiza.
 */
export function buildInboxView(invitations: InviteForUserPublic[]): InboxView {
  const items = [...invitations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const count = items.length;
  const headline = count === 1 ? "1 convite pendente" : `${count} convites pendentes`;
  return { count, headline, items };
}
