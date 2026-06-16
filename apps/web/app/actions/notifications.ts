"use server";

import type { NotificationPrefsUpdate } from "@traveltogether/types";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import {
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPrefs,
} from "@/lib/api/notifications";

export async function markNotificationReadAction(notificationId: string) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return markNotificationRead(session.apiAccessToken, notificationId);
}

export async function markAllNotificationsReadAction() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return markAllNotificationsRead(session.apiAccessToken);
}

export async function updateNotificationPrefsAction(data: NotificationPrefsUpdate) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return updateNotificationPrefs(session.apiAccessToken, data);
}
