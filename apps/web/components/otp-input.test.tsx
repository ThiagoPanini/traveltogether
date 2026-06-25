import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "./otp-input";

/** Wrapper controlado: espelha o `value` para checar a montagem dígito-a-dígito. */
function Harness() {
  const [value, setValue] = useState("");
  return (
    <>
      <OtpInput value={value} onChange={setValue} />
      <output data-testid="valor">{value}</output>
    </>
  );
}

describe("OtpInput (código de embarque)", () => {
  it("expõe um grupo rotulado 'Código de embarque' com 6 células", () => {
    render(<OtpInput value="" onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: /código de embarque/i })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("cada célula pede teclado numérico e o autofill de OTP", () => {
    render(<OtpInput value="" onChange={vi.fn()} />);
    for (const cell of screen.getAllByRole("textbox")) {
      expect(cell).toHaveAttribute("inputmode", "numeric");
      expect(cell).toHaveAttribute("autocomplete", "one-time-code");
    }
  });

  it("monta o código conforme o usuário digita as 6 células", () => {
    render(<Harness />);
    const cells = screen.getAllByRole("textbox");
    "246813".split("").forEach((digit, i) => {
      fireEvent.change(cells[i], { target: { value: digit } });
    });
    expect(screen.getByTestId("valor")).toHaveTextContent("246813");
  });

  it("ignora caracteres não-numéricos", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const cells = screen.getAllByRole("textbox");
    fireEvent.change(cells[0], { target: { value: "a" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("colar 6 dígitos na primeira célula preenche o código inteiro", () => {
    render(<Harness />);
    const cells = screen.getAllByRole("textbox");
    fireEvent.paste(cells[0], {
      clipboardData: { getData: () => "246813" },
    });
    expect(screen.getByTestId("valor")).toHaveTextContent("246813");
  });

  it("colar dígitos no meio do código preenche a partir dali", () => {
    render(<Harness />);
    const cells = screen.getAllByRole("textbox");
    // Parte dos dígitos já preenchidos via change para simular valor inicial
    fireEvent.change(cells[0], { target: { value: "1" } });
    fireEvent.change(cells[1], { target: { value: "2" } });
    // Cola a partir da célula 2 (index 2)
    fireEvent.paste(cells[2], {
      clipboardData: { getData: () => "3456" },
    });
    expect(screen.getByTestId("valor")).toHaveTextContent("123456");
  });

  it("autofill (múltiplos dígitos na primeira célula) distribui o código", () => {
    render(<Harness />);
    const cells = screen.getAllByRole("textbox");
    fireEvent.change(cells[0], { target: { value: "246813" } });
    expect(screen.getByTestId("valor")).toHaveTextContent("246813");
  });

  it("colar ignora não-dígitos e extrai só números", () => {
    render(<Harness />);
    const cells = screen.getAllByRole("textbox");
    fireEvent.paste(cells[0], {
      clipboardData: { getData: () => "24 68-13" },
    });
    expect(screen.getByTestId("valor")).toHaveTextContent("246813");
  });
});
