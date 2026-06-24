import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppHome from "./page";

describe("/app (stub da área autenticada)", () => {
  it("renderiza um marcador da área logada para as fatias seguintes aterrissarem", () => {
    render(<AppHome />);
    expect(screen.getByRole("heading", { name: /minhas viagens/i })).toBeInTheDocument();
  });
});
