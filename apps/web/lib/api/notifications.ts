import type {
  NotificationInbox,
  NotificationPrefsPublic,
  NotificationPrefsUpdate,
  NotificationPublic,
} from "@traveltogether/types";

const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

const EMPTY_INBOX: NotificationInbox = { unread_count: 0, items: [] };

export async function getNotifications(accessToken: string): Promise<NotificationInbox> {
  try {
    const response = await fetch(`${apiUrl()}/me/notifications`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return EMPTY_INBOX;
    return (await response.json()) as NotificationInbox;
  } catch {
    return EMPTY_INBOX;
  }
}

export async function markNotificationRead(
  accessToken: string,
  notificationId: string,
): Promise<NotificationPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/me/notifications/${notificationId}/read`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return null;
    return (await response.json()) as NotificationPublic;
  } catch {
    return null;
  }
}

export async function markAllNotificationsRead(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/me/notifications/read-all`, {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

export async function getNotificationPrefs(
  accessToken: string,
): Promise<NotificationPrefsPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/me/notification-prefs`, {
      cache: "no-store",
      headers: authHeaders(accessToken),
    });
    if (!response.ok) return null;
    return (await response.json()) as NotificationPrefsPublic;
  } catch {
    return null;
  }
}

export async function updateNotificationPrefs(
  accessToken: string,
  data: NotificationPrefsUpdate,
): Promise<NotificationPrefsPublic | null> {
  try {
    const response = await fetch(`${apiUrl()}/me/notification-prefs`, {
      method: "PUT",
      cache: "no-store",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return (await response.json()) as NotificationPrefsPublic;
  } catch {
    return null;
  }
}
