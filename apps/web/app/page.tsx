import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { rootRedirectTarget } from "@/lib/identity/session";

// Raiz da rodada 0 (chassi Espresso, ADR-0020): a landing pública dorme — `/`
// só roteia. Logado → Painel; deslogado → Login. A page de /overview revalida
// o usuário e devolve a /login se o token não resolver, então aqui basta a
// presença do token. Componentes da landing (home-preview, public-top-bar,
// lib/home) deixam de ser importados por qualquer rota viva.
export default async function Home() {
  const session = await getAuthSession();
  redirect(rootRedirectTarget(session));
}
