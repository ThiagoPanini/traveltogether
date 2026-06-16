import Link from "next/link";
import { redirect } from "next/navigation";

import { AppTopbar } from "@/app/app-topbar";
import { getAuthSession } from "@/auth";
import { Breadcrumbs } from "@/components/atlas";
import { activityHref, activityKindLabel } from "@/lib/activity/activity-item";
import { getRecentActivity } from "@/lib/api/activity";

export default async function ActivityPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const activity = await getRecentActivity(session.apiAccessToken, 50);

  return (
    <div className="app-shell">
      <AppTopbar />
      <main className="page fadeup">
        <div className="shell" style={{ maxWidth: 760 }}>
          <Breadcrumbs items={[{ label: "Viagens", href: "/trips" }, { label: "Atividade" }]} />
          <h1 className="display" style={{ fontSize: 36, marginBottom: 6 }}>
            Atividade
          </h1>
          <p className="soft" style={{ marginBottom: 30 }}>
            O que andou acontecendo nas suas Viagens, em ordem. Visível para todo o grupo — sem
            estado de leitura, diferente das Notificações.
          </p>

          {activity.length === 0 ? (
            <div className="empty">
              <p>Nada por aqui ainda.</p>
              <p className="soft" style={{ fontSize: 14 }}>
                Quando alguém entrar numa Viagem, registrar uma Pesquisa de Passagem ou comentar, o
                rastro aparece aqui.
              </p>
            </div>
          ) : (
            <div className="card flat" style={{ padding: "10px 24px" }}>
              <div style={{ display: "grid" }}>
                {activity.map((item) => (
                  <Link
                    key={item.id}
                    href={activityHref(item)}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      textDecoration: "none",
                      color: "inherit",
                      padding: "14px 0",
                      borderBottom: "1px solid var(--line-soft)",
                    }}
                  >
                    <span
                      className="chip outline"
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        flexShrink: 0,
                      }}
                    >
                      {activityKindLabel(item.kind)}
                    </span>
                    {item.actor_name && (
                      <span style={{ fontWeight: 600, fontSize: 13.5, flexShrink: 0 }}>
                        {item.actor_name}
                      </span>
                    )}
                    <span
                      className="soft"
                      style={{
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.body}
                    </span>
                    <span className="spacer" style={{ flex: 1 }} />
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}
                    >
                      {item.trip_name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
