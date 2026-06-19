import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { PanelView } from "@/components/panel-view";
import { getCurrentUser } from "@/lib/api/current-user";
import { getRoutes } from "@/lib/api/routes";
import { getLegs, getTripMembers, getTrips } from "@/lib/api/trips";
import {
  type ActiveTripBundle,
  buildActivePanel,
  type PanelLegMode,
  selectActiveTrip,
} from "@/lib/dashboard/active-panel";
import { buildGreeting } from "@/lib/dashboard/greeting";
import { displayLabel } from "@/lib/identity/user-display";

// Início (#161, chassi Espresso): Painel da Viagem ativa/próxima. A page server
// só busca os dados; toda derivação vive em `buildActivePanel` (testado) e a
// pintura no `PanelView` apresentacional. Sem regra de domínio nem JSX de tela.
export default async function OverviewPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const accessToken = session.apiAccessToken;
  const [user, trips] = await Promise.all([getCurrentUser(accessToken), getTrips(accessToken)]);
  if (!user) redirect("/login");

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const greeting = buildGreeting(displayLabel(user), now);
  const activeTrip = selectActiveTrip(trips, todayIso);

  // Carrega Trajetos, membros e modos só da Viagem em foco (sem N+1 global).
  let active: ActiveTripBundle | null = null;
  if (activeTrip) {
    const tripId = activeTrip.trip.id;
    const [legs, memberList] = await Promise.all([
      getLegs(accessToken, tripId),
      getTripMembers(accessToken, tripId),
    ]);
    // Modo de cada Trajeto = modo do único Trecho da sua Rota direta (rodada 0).
    const routesByLeg = await Promise.all(
      legs.map((leg) => getRoutes(accessToken, tripId, leg.id)),
    );
    const legMode: Record<string, PanelLegMode> = {};
    legs.forEach((leg, i) => {
      const mode = routesByLeg[i][0]?.segments[0]?.mode;
      if (mode) legMode[leg.id] = mode;
    });

    active = {
      trip: activeTrip,
      legs,
      members: (memberList?.members ?? []).map((m) => ({
        seed: m.membership.user_id,
        label: m.display_name ?? m.email,
        avatarUrl: m.avatar_url,
      })),
      legMode,
    };
  }

  const panel = buildActivePanel({ trips, active, todayIso });

  return (
    <AppShell user={user}>
      <PanelView greeting={greeting} panel={panel} />
    </AppShell>
  );
}
