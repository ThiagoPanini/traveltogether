/**
 * Decisão de proteção de rota do middleware (#193), isolada como função pura para ser
 * testável sem o runtime do Next/Auth.js. Só `/app/*` é protegida: exige sessão e
 * onboarding concluído; todo o resto (`/`, `/tokens`, `/entrar`, `/onboarding`) é
 * público. O middleware traduz o destino devolvido em `NextResponse.redirect`.
 */

/** Entrada da decisão de guarda: caminho pedido e estado da sessão (lido do JWT). */
export type GuardInput = {
  pathname: string;
  isLoggedIn: boolean;
  needsOnboarding: boolean;
};

/**
 * Resolve o destino de redirect para uma navegação, ou `null` para deixar passar.
 *
 * @param input - Caminho pedido + estado da sessão.
 * @returns `/entrar` (sem sessão), `/onboarding` (logado mas sem perfil) ou `null`.
 */
export function guardRoute({ pathname, isLoggedIn, needsOnboarding }: GuardInput): string | null {
  if (!pathname.startsWith("/app")) {
    return null;
  }
  if (!isLoggedIn) {
    return "/entrar";
  }
  if (needsOnboarding) {
    return "/onboarding";
  }
  return null;
}
