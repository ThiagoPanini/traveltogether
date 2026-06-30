import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pathname } = vi.hoisted(() => ({ pathname: { value: "/app" } }));

vi.mock("./actions", () => ({ logout: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { AppShell, type ShellData } from "./app-shell";

const shell: ShellData = {
  user: {
    nameLabel: "Maria Souza",
    originLabel: "Curitiba",
    originMeta: "Curitiba · BR",
    initial: "M",
  },
  trips: [{ id: "t1", name: "Costa Leste", destination_city: "Nova York", my_role: "organizer" }],
  invitationCount: 2,
};

function renderShell() {
  return render(
    <AppShell shell={shell}>
      <main>Conteúdo autenticado</main>
    </AppShell>,
  );
}

beforeEach(() => {
  pathname.value = "/app";
  window.localStorage.clear();
});

describe("AppShell", () => {
  it("mantém menu, perfil e ação de sair na área autenticada", () => {
    renderShell();

    const menu = screen.getByRole("complementary", { name: /menu principal/i });
    expect(within(menu).getByRole("link", { name: /travelmanager/i })).toHaveAttribute(
      "href",
      "/app",
    );
    expect(within(menu).getByText("Maria Souza")).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: /sair/i })).toBeInTheDocument();
    expect(screen.getByText(/base ativa · curitiba/i)).toBeInTheDocument();
  });

  it("colapsa a sidebar e persiste a preferência localmente", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: /compactar menu/i }));

    expect(window.localStorage.getItem("travelmanager.sidebar.collapsed")).toBe("true");
    expect(screen.getByRole("button", { name: /expandir menu/i })).toBeInTheDocument();
  });

  it("marca viagens como seção ativa em rotas de viagem", () => {
    pathname.value = "/app/viagens/t1";

    renderShell();

    expect(screen.getByText("Painel da viagem")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /minhas viagens/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
