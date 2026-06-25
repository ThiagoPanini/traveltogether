"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Fronteira de sessão client-side do onboarding.
 *
 * O `OnboardingForm` usa `useSession().update()` para renovar o JWT obsoleto após
 * onboardar (#193), e esse hook **exige** o contexto do `SessionProvider`. Sem ele a
 * página estoura no browser — em produção o next-auth pula o aviso amigável e lê
 * `value.status` de `undefined` ("Application error: a client-side exception").
 * Recebe a sessão já resolvida no servidor (`auth()`) para hidratar o estado inicial
 * sem um refetch.
 */
export function SessionBoundary({
  session,
  children,
}: {
  session: Session | null;
  children: ReactNode;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
