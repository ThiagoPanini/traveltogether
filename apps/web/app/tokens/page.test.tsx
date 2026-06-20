import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TokensPage from "./page";

describe("TokensPage (kitchen sink)", () => {
  it("renderiza o título e as seções de paleta e tipografia", () => {
    render(<TokensPage />);
    expect(screen.getByRole("heading", { level: 1, name: /tokens/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /paleta/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /tipografia/i })).toBeInTheDocument();
  });

  it("mostra o token de accent na paleta", () => {
    render(<TokensPage />);
    expect(screen.getByText("--accent")).toBeInTheDocument();
  });
});
