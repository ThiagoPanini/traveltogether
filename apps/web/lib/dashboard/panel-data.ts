import type {
  ActivityItemPublic,
  BudgetSummary,
  NotificationInbox,
  NotificationKind,
  NotificationPublic,
  PendingActionPublic,
  TaskWithAssignees,
  TripSummary,
} from "@traveltogether/types";

import type { IconName, StackMember } from "@/components/atlas";
import { activityHref, activityKindLabel } from "../activity/activity-item";
import { moneyValue } from "../fares/format";
import { dateOnly, formatDateRange, formatWeekdayDayMonth, nightsBetween } from "../format/date";
import { buildMyTasksView } from "../tasks/my-tasks";
import { type TripStatus, tripProgress, tripStatus } from "../trips/card";
import { displayCode } from "../trips/journey";
import { tripTabHref } from "../trips/tabs";
import { type PendingItem, toPendingItem } from "./pending";

// Formata um valor na moeda dada (pt-BR). Fallback explícito quando a moeda é
// desconhecida pelo Intl, para nunca quebrar a renderização do Painel.
export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

// Contagem regressiva até uma data, derivada de "hoje" (ambos YYYY-MM-DD ou
// datetime — Parada são datetime, então truncamos para o dia). Espelha o
// protótipo: passado / hoje / N dias. Drive do primitivo `Countdown` do atlas.
export type CountdownValue = { kind: "past" } | { kind: "today" } | { kind: "days"; days: number };

export function countdown(targetIso: string | null | undefined, nowIso: string): CountdownValue {
  const target = dateOnly(targetIso);
  const now = dateOnly(nowIso);
  if (!target || !now) return { kind: "past" };
  const days = Math.round(
    (new Date(`${target}T00:00:00`).getTime() - new Date(`${now}T00:00:00`).getTime()) / 86_400_000,
  );
  if (days < 0) return { kind: "past" };
  if (days === 0) return { kind: "today" };
  return { kind: "days", days };
}

// Pendência (#58) → cartão de alerta do Painel ("o que precisa de mim").
// Drive do primitivo `AlertCard`: ícone por tipo, título = verbo, subtítulo =
// Trajeto · Viagem. Decidir a Escolhida → bússola; registrar Pesquisa → upvote.
export interface PanelAlert {
  icon: IconName;
  title: string;
  sub: string;
  href: string;
}

export function pendingToAlert(item: PendingItem): PanelAlert {
  return {
    icon: item.kind === "fare_without_chosen" ? "compass" : "up",
    title: item.verb,
    sub: `${item.target} · ${item.tripName}`,
    href: item.href,
  };
}

// Linhas do snapshot de Orçamento: uma por moeda, JAMAIS somadas entre si
// (Invariante 15, ADR-0016). Mantém o valor numérico por pessoa para métricas
// e a versão formatada para exibição. Ordenado por moeda.
export interface PanelBudgetRow {
  currency: string;
  perPersonValue: number;
  perPerson: string;
  perGroup: string;
}

export function budgetRows(summary: BudgetSummary | null | undefined): PanelBudgetRow[] {
  if (!summary) return [];
  return summary.subtotals
    .map((s) => {
      const perPersonValue = moneyValue(s.per_person);
      return {
        currency: s.currency,
        perPersonValue,
        perPerson: formatMoney(perPersonValue, s.currency),
        perGroup: formatMoney(moneyValue(s.per_group), s.currency),
      };
    })
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

// Cartão "próxima viagem" do Painel: panorama acionável de uma única Viagem.
// Tudo derivado das mesmas regras das outras superfícies (status, progresso,
// rota, Orçamento por moeda) — sem inventar dados que o backend não tem.
export interface PanelHero {
  tripId: string;
  name: string;
  status: TripStatus;
  coverSeed: string;
  coverCode: string;
  rangeLabel: string;
  nights: number | null;
  countdown: CountdownValue;
  routeCodes: string[];
  members: StackMember[];
  legsChosen: number;
  legsTotal: number;
  openTasks: number;
  perPersonLabel: string;
  href: string;
}

export interface HeroInput {
  trip: TripSummary;
  pending: PendingItem[];
  budget: BudgetSummary | null;
  openTasks: number;
  members: StackMember[];
  nowIso: string;
}

export function buildHero({
  trip,
  pending,
  budget,
  openTasks,
  members,
  nowIso,
}: HeroInput): PanelHero {
  const { trip: t, stops } = trip;
  const progress = tripProgress(stops.length, pending);
  const originCode = t.airport_code ?? displayCode(t.origin);
  const rows = budgetRows(budget);
  return {
    tripId: t.id,
    name: t.name,
    status: tripStatus(t.start_date, t.end_date, stops.length > 0, nowIso),
    coverSeed: t.name,
    coverCode: originCode,
    rangeLabel: formatDateRange(t.start_date, t.end_date),
    nights: nightsBetween(t.start_date, t.end_date),
    countdown: countdown(t.start_date, nowIso),
    routeCodes: [
      originCode,
      ...stops.map((s) => s.airport_code ?? displayCode(s.city)),
      originCode,
    ],
    members,
    legsChosen: progress.legsChosen,
    legsTotal: progress.legsTotal,
    openTasks,
    perPersonLabel: rows.length ? rows.map((r) => r.perPerson).join(" · ") : "—",
    href: `/trips/${t.id}`,
  };
}

// Saudação por hora do dia (espelha o protótipo).
export function greetingWord(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Ícone do aviso (Notificação — ADR-0017) por tipo.
const NOTIF_ICONS: Record<NotificationKind, IconName> = {
  invite: "users",
  task: "checkSquare",
  mention: "chat",
  decision: "compass",
};

export function notificationIcon(kind: NotificationKind): IconName {
  return NOTIF_ICONS[kind];
}

// Aviso → link que o resolve: a Viagem a que pertence (ou o painel se órfão).
export function notificationHref(notif: NotificationPublic): string {
  return notif.trip_id ? `/trips/${notif.trip_id}` : "/overview";
}

// Data local YYYY-MM-DD de um `Date` (não UTC) — base da saudação e do rótulo
// de hoje. Usar componentes locais evita o salto de dia perto da meia-noite.
function localDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Linha de Atividade recente no Painel (#100). Drive de uma linha apresentacional.
export interface PanelActivityEntry {
  id: string;
  kindLabel: string;
  actorName: string | null;
  body: string;
  tripName: string;
  href: string;
}

// Linha de "minhas Tarefas" no Painel (#107), só Tarefas abertas.
export interface PanelTaskRow {
  id: string;
  title: string;
  statusLabel: string;
  tripName: string;
  href: string;
}

// Aviso (Notificação — ADR-0017) renderizável no Painel.
export interface PanelNotif {
  id: string;
  icon: IconName;
  text: string;
  href: string;
}

// Snapshot de Orçamento da próxima Viagem: linhas por moeda (sem conversão —
// Invariante 15) + link para a aba de Orçamento da Viagem.
export interface PanelBudgetSnapshot {
  tripName: string;
  rows: PanelBudgetRow[];
  href: string;
}

// Tudo que o Painel precisa para renderizar, já derivado e determinístico.
// `PanelView` consome isto e NADA mais — sem fetch, sem sessão (testável com
// dados estáticos). A page server só busca os dados e chama `buildPanelData`.
export interface PanelData {
  greeting: string;
  todayLabel: string | null;
  waitingLabel: string;
  alerts: PanelAlert[];
  hero: PanelHero | null;
  activity: PanelActivityEntry[];
  tasks: PanelTaskRow[];
  notifications: PanelNotif[];
  unreadCount: number;
  budget: PanelBudgetSnapshot | null;
  hasTrips: boolean;
  // Totais (não a fatia exibida) para os badges da navegação.
  pendingCount: number;
  taskCount: number;
}

export interface PanelInput {
  userName: string;
  now: Date;
  nextTrip: TripSummary | null;
  trips: TripSummary[];
  pending: PendingActionPublic[];
  tasks: TaskWithAssignees[];
  activity: ActivityItemPublic[];
  notifications: NotificationInbox;
  heroBudget: BudgetSummary | null;
  heroMembers: StackMember[];
}

// Quantas pendências ainda esperam o usuário (frase do cabeçalho do Painel).
function waitingLabel(count: number): string {
  if (count === 0) return "tudo em dia por aqui";
  return `${count} coisa${count !== 1 ? "s" : ""} esperando você`;
}

// Costura todas as superfícies já construídas num único panorama acionável.
// Função pura: mesma entrada → mesma saída. É o coração testável do Painel.
export function buildPanelData(input: PanelInput): PanelData {
  const { userName, now, nextTrip, trips, pending, tasks, activity, notifications } = input;
  const nowIso = localDateIso(now);
  const firstName = userName.split(" ")[0] || userName;
  const greeting = `${greetingWord(now.getHours())}, ${firstName}.`;

  // "O que precisa de mim" = pendências de Trajeto (Pesquisa/Escolhida). O
  // Roteiro pendente mora na própria Viagem, não no Painel.
  const trajectoryPending = pending.filter((a) => a.kind !== "stop_without_itinerary");
  const alerts = trajectoryPending.map(toPendingItem).map(pendingToAlert).slice(0, 5);

  const hero = nextTrip
    ? buildHero({
        trip: nextTrip,
        pending: pending
          .filter((a) => a.trip_id === nextTrip.trip.id && a.kind !== "stop_without_itinerary")
          .map(toPendingItem),
        budget: input.heroBudget,
        openTasks: tasks.filter((t) => t.trip_id === nextTrip.trip.id && t.status !== "done")
          .length,
        members: input.heroMembers,
        nowIso,
      })
    : null;

  const tasksView = buildMyTasksView(tasks, trips);
  const openTasks: PanelTaskRow[] = tasksView.columns
    .filter((c) => c.status !== "done")
    .flatMap((c) => c.tasks)
    .slice(0, 4)
    .map((task) => ({
      id: task.id,
      title: task.title,
      statusLabel: task.status === "doing" ? "fazendo" : "a fazer",
      tripName: task.trip_name,
      href: tripTabHref(task.trip_id, "tasks"),
    }));

  const unreadNotifs: PanelNotif[] = notifications.items
    .filter((n) => n.read_at === null)
    .slice(0, 3)
    .map((n) => ({
      id: n.id,
      icon: notificationIcon(n.kind),
      text: n.text,
      href: notificationHref(n),
    }));

  const heroBudgetRows = budgetRows(input.heroBudget);
  const budget: PanelBudgetSnapshot | null =
    nextTrip && heroBudgetRows.length
      ? {
          tripName: nextTrip.trip.name,
          rows: heroBudgetRows,
          href: tripTabHref(nextTrip.trip.id, "budget"),
        }
      : null;

  return {
    greeting,
    todayLabel: formatWeekdayDayMonth(nowIso),
    waitingLabel: waitingLabel(alerts.length),
    alerts,
    hero,
    activity: activity.slice(0, 6).map((item) => ({
      id: item.id,
      kindLabel: activityKindLabel(item.kind),
      actorName: item.actor_name,
      body: item.body,
      tripName: item.trip_name,
      href: activityHref(item),
    })),
    tasks: openTasks,
    notifications: unreadNotifs,
    unreadCount: notifications.unread_count,
    budget,
    hasTrips: trips.length > 0,
    pendingCount: trajectoryPending.length,
    taskCount: tasksView.count,
  };
}
