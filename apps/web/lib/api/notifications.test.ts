import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getNotificationPrefs,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPrefs,
} from "./notifications";

const INBOX: import("@traveltogether/types").NotificationInbox = {
  unread_count: 1,
  items: [
    {
      id: "ntf-1",
      kind: "invite",
      trip_id: "trip-1",
      target_type: null,
      target_id: null,
      text: "Você foi convidado para Eurotrip",
      read_at: null,
      created_at: "2026-06-15T00:00:00Z",
    },
  ],
};

describe("getNotifications", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retorna a caixa de entrada com token válido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(INBOX) }),
    );

    await expect(getNotifications("token")).resolves.toEqual(INBOX);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/me/notifications",
      expect.any(Object),
    );
  });

  it("retorna caixa vazia quando API não responde", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(getNotifications("token")).resolves.toEqual({ unread_count: 0, items: [] });
  });
});

describe("markNotificationRead", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia POST ao endpoint de leitura e retorna a Notificação", async () => {
    const read = { ...INBOX.items[0], read_at: "2026-06-15T01:00:00Z" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(read) }),
    );

    await expect(markNotificationRead("token", "ntf-1")).resolves.toEqual(read);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/me/notifications/ntf-1/read",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("retorna null em falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(markNotificationRead("token", "ntf-1")).resolves.toBeNull();
  });
});

describe("markAllNotificationsRead", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia POST read-all e retorna true em 204", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 204 }));
    await expect(markAllNotificationsRead("token")).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/me/notifications/read-all",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

const PREFS: import("@traveltogether/types").NotificationPrefsPublic = {
  decision: true,
  task: true,
  mention: true,
  digest: false,
};

describe("getNotificationPrefs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retorna prefs do destinatário", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(PREFS) }),
    );
    await expect(getNotificationPrefs("token")).resolves.toEqual(PREFS);
  });

  it("retorna null em falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(getNotificationPrefs("token")).resolves.toBeNull();
  });
});

describe("updateNotificationPrefs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia PUT com o patch e retorna prefs atualizadas", async () => {
    const updated = { ...PREFS, decision: false };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(updated) }),
    );
    await expect(updateNotificationPrefs("token", { decision: false })).resolves.toEqual(updated);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/me/notification-prefs",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
