import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/api/current-user";
import { getMyTasks } from "@/lib/api/tasks";
import { getTrips } from "@/lib/api/trips";
import { buildMyTasksView } from "@/lib/tasks/my-tasks";

import MyTasksBoard from "./my-tasks-board";

// Tela global das Tarefas em que sou Responsável (#107). Agrega as Tarefas de
// todas as minhas Viagens num só board; o nome da Viagem é resolvido aqui porque
// o DTO de Tarefa só carrega trip_id.
export default async function TasksPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const accessToken = session.apiAccessToken;
  const [user, tasks, trips] = await Promise.all([
    getCurrentUser(accessToken),
    getMyTasks(accessToken),
    getTrips(accessToken),
  ]);
  if (!user) redirect("/login");

  const view = buildMyTasksView(tasks, trips);
  const enriched = view.columns.flatMap((col) => col.tasks);

  return (
    <AppShell user={user} counts={{ tasks: view.count }}>
      <main className="page fadeup">
        <div className="shell">
          <div className="section-head" style={{ marginBottom: 6 }}>
            <div>
              <span className="kicker">tarefas</span>
              <h1 className="display" style={{ fontSize: 36 }}>
                O que precisa de mim
              </h1>
            </div>
          </div>
          <p className="soft" style={{ marginBottom: 30, maxWidth: 560 }}>
            Tarefas em que você é Responsável, de todas as suas Viagens. Arraste um cartão entre as
            colunas para mudar o status.
          </p>
          <MyTasksBoard initialTasks={enriched} />
        </div>
      </main>
    </AppShell>
  );
}
