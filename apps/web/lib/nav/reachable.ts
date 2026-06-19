// Superfície alcançável da rodada 0 (chassi Espresso, ADR-0020, issue #163).
// Predicado puro consumido pelo middleware: só o que o protótipo validou
// responde por URL — home pública, login, Painel (Início) e wizard de cadastro.
// Miolo profundo da Viagem e laterais globais (Tarefas/Atividade/Notificações/
// Perfil) ficam inacessíveis; o código segue dormente no repo, sem entrada.
// Rotas de plataforma (/api, assets) nunca chegam aqui — o matcher as exclui.

const REACHABLE: ReadonlySet<string> = new Set(["/", "/login", "/overview", "/trips/new"]);

/** Normaliza removendo barra final redundante (exceto a raiz). */
function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function isReachablePath(pathname: string): boolean {
  return REACHABLE.has(normalize(pathname));
}
