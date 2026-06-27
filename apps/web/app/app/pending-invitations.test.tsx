import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { type PendingInvitation, PendingInvitations } from "./pending-invitations";

const invites: PendingInvitation[] = [
  { id: "i1", trip_id: "t9", trip_name: "Road Trip", role: "member", invited_by_name: "Ana" },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("PendingInvitations", () => {
  it("mostra o nome da viagem, o papel e quem convidou", () => {
    render(<PendingInvitations invitations={invites} />);
    expect(screen.getByText("Road Trip")).toBeInTheDocument();
    expect(screen.getByText(/membro · convite de ana/i)).toBeInTheDocument();
  });

  it("aceitar chama POST /api/invitations/{id}/accept e revalida", async () => {
    render(<PendingInvitations invitations={invites} />);

    fireEvent.click(screen.getByRole("button", { name: /aceitar/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("/api/invitations/i1/accept");
    expect(init?.method).toBe("POST");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("falha no aceite mostra erro e não revalida", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 403 }));
    render(<PendingInvitations invitations={invites} />);

    fireEvent.click(screen.getByRole("button", { name: /aceitar/i }));

    await screen.findByRole("alert");
    expect(refresh).not.toHaveBeenCalled();
  });
});
