import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/api/current-user";

import { NewTripForm } from "./new-trip-form";

// Cadastro de Viagem (rodada 0 Espresso): page server só resolve sessão/usuário
// e veste o casco; o wizard de 6 passos vive no client. Ver ADR-0020, #162.
export default async function NewTripPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const user = await getCurrentUser(session.apiAccessToken);
  if (!user) redirect("/login");

  return (
    <AppShell user={user}>
      <div className="wiz-head">
        <span className="kicker">Nova viagem</span>
        <h1>Comece pelo nome.</h1>
        <p>Origem, paradas e modo entram em seguida — passagens, depois, no Painel.</p>
      </div>
      <NewTripForm creatorEmail={user.email} />
    </AppShell>
  );
}
