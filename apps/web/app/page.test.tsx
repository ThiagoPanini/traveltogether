import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renderiza o wordmark travel·together", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /travel·together/i })).toBeInTheDocument();
  });
});
