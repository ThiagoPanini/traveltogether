import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/api/current-user";
import { getNotificationPrefs, getNotifications } from "@/lib/api/notifications";

import { InboxView } from "./inbox-view";

export default async function NotificationsPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const accessToken = session.apiAccessToken;
  const [user, inbox, prefs] = await Promise.all([
    getCurrentUser(accessToken),
    getNotifications(accessToken),
    getNotificationPrefs(accessToken),
  ]);
  if (!user) redirect("/login");

  return (
    <AppShell user={user} counts={{ notifications: inbox.unread_count }}>
      <main className="page fadeup">
        <div className="shell">
          <InboxView items={inbox.items} prefs={prefs} />
        </div>
      </main>
    </AppShell>
  );
}
