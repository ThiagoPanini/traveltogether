import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

import { hasApiAccessToken } from "./lib/identity/session";
import { isReachablePath } from "./lib/nav/reachable";

// Duas camadas no mesmo middleware:
// 1. `authorized` — gate de sessão (ADR-0003): sem token de API → /login.
// 2. `middleware` — gate de SUPERFÍCIE da rodada 0 (#163): fora do que o
//    protótipo validou, redireciona para o Painel. O miolo profundo da Viagem
//    e as laterais globais ficam inacessíveis por URL direta, sem deletar nada.
export default withAuth(
  function middleware(req) {
    if (!isReachablePath(req.nextUrl.pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/overview";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized({ req, token }) {
        if (req.nextUrl.pathname === "/") return true;
        if (req.nextUrl.pathname.startsWith("/login")) return true;
        return hasApiAccessToken(token);
      },
    },
  },
);

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
