import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { getCurrentUser } from "@/lib/api/current-user";
import { hasApiAccessToken } from "@/lib/identity/session";

import { LoginForm } from "./login-form";

// Login "Caderno de Bordo" no chassi Espresso (ADR-0020, #166): cartão marfim
// centrado sobre o fundo que deriva/respira. Já logado cai no Painel.
export default async function LoginPage() {
  const session = await getAuthSession();
  if (hasApiAccessToken(session)) {
    const currentUser = await getCurrentUser(session.apiAccessToken);
    if (currentUser) redirect("/overview");
  }

  return (
    <main className="auth">
      <svg
        className="auth-bg"
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="none" stroke="var(--accent)" strokeWidth="1.1" opacity="0.16">
          <path d="M-40 250 C 120 200, 200 320, 360 270 S 640 180, 860 250" />
          <path d="M-40 320 C 120 280, 220 400, 380 340 S 660 250, 860 330" />
          <path d="M-40 400 C 140 360, 220 470, 400 420 S 680 330, 860 410" />
          <path d="M-40 500 C 140 460, 240 560, 410 510 S 700 430, 860 500" />
          <path d="M-40 600 C 150 560, 250 650, 420 610 S 700 540, 860 600" />
        </g>
      </svg>
      <LoginForm />
    </main>
  );
}
