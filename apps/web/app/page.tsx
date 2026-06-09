import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { getCurrentUser } from "@/lib/api/current-user";
import { getApiHealth } from "@/lib/api/health";

import { LogoutButton } from "./logout-button";

export default async function Home() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const [health, currentUser] = await Promise.all([
    getApiHealth(),
    getCurrentUser(session.apiAccessToken),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <main className="home-shell">
      <section className="home-topbar">
        <div>
          <p className="eyebrow">traveltogether</p>
          <h1>Viagem em construção</h1>
        </div>
        <LogoutButton />
      </section>

      <section className="status-strip" aria-label="Status da plataforma">
        <p>
          Sessão <strong>{currentUser.email}</strong>
        </p>
        <p>
          API <span data-state={health.status}>{health.status}</span>
        </p>
        <p>
          DB <span data-state={health.db}>{health.db}</span>
        </p>
      </section>
    </main>
  );
}
