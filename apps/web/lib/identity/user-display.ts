// Resolve como apresentar um Usuário (nome de exibição → e-mail) e suas
// iniciais, para substituir o e-mail cru na interface (board de Membros,
// autoria de Pesquisa de Passagem).

export interface DisplayableUser {
  display_name: string | null;
  email: string;
}

/** Rótulo de exibição: nome quando houver, senão a parte local do e-mail. */
export function displayLabel(user: DisplayableUser): string {
  const name = user.display_name?.trim();
  if (name) return name;
  const [local] = user.email.split("@");
  return local || user.email;
}

/** Até duas iniciais maiúsculas para o avatar de fallback. */
export function initials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
