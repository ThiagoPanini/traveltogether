import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { PanelView } from "@/components/panel-view";
import { getRecentActivity } from "@/lib/api/activity";
import { getBudget } from "@/lib/api/budget";
import { getCurrentUser } from "@/lib/api/current-user";
import { getNotifications } from "@/lib/api/notifications";
import { getPendingActions } from "@/lib/api/pending";
import { getMyTasks } from "@/lib/api/tasks";
import { getTripMembers, getTrips } from "@/lib/api/trips";
import { selectNextTrip } from "@/lib/dashboard/next-trip";
import { buildPanelData } from "@/lib/dashboard/panel-data";

// Painel (#111/#135): home do usuário logado. A page server SÓ busca os dados e
// os passa a `buildPanelData`; toda derivação vive no módulo testado e a pintura
// no `PanelView` apresentacional. Aqui não há regra de domínio nem JSX de tela.
export default async function OverviewPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const accessToken = session.apiAccessToken;
  const [user, trips, pending, tasks, activity, notifications] = await Promise.all([
    getCurrentUser(accessToken),
    getTrips(accessToken),
    getPendingActions(accessToken),
    getMyTasks(accessToken),
    getRecentActivity(accessToken, 6),
    getNotifications(accessToken),
  ]);
  if (!user) redirect("/login");

  const now = new Date();
  const nowIso = now.toISOString().slice(0, 10);
  const nextTrip = selectNextTrip(trips, nowIso);

  // Orçamento e membros são buscados só da Viagem em destaque (sem N+1 global).
  const [heroBudget, heroMemberList] = nextTrip
    ? await Promise.all([
        getBudget(accessToken, nextTrip.trip.id),
        getTripMembers(accessToken, nextTrip.trip.id),
      ])
    : [null, null];
  const heroMembers = (heroMemberList?.members ?? []).map((m) => ({
    seed: m.membership.user_id,
    label: m.display_name ?? m.email,
    avatarUrl: m.avatar_url,
  }));

  const data = buildPanelData({
    userName: user.display_name ?? "viajante",
    now,
    nextTrip,
    trips,
    pending,
    tasks,
    activity,
    notifications,
    heroBudget,
    heroMembers,
  });

  return (
    <AppShell user={user} counts={{ pending: data.pendingCount, tasks: data.taskCount }}>
      <main>
        <PanelView data={data} readOnly={false} />
      </main>
    </AppShell>
  );
}
