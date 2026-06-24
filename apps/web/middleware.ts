import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { guardRoute } from "@/lib/auth/route-guard";

/**
 * Proteção de rota da área logada (#193). O wrapper `auth` do Auth.js injeta a sessão
 * (lida do JWT no cookie httpOnly) em `req.auth`; a decisão pura mora em `guardRoute`.
 * O `matcher` restringe a execução a `/app/*` — todo o resto (`/`, `/tokens`,
 * `/entrar`, `/onboarding`, callbacks do Auth.js) segue público sem passar por aqui.
 */
export default auth((req) => {
  const target = guardRoute({
    pathname: req.nextUrl.pathname,
    isLoggedIn: Boolean(req.auth),
    needsOnboarding: req.auth?.needsOnboarding ?? false,
  });
  if (target) {
    return NextResponse.redirect(new URL(target, req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*"],
};
