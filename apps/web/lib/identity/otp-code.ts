/** Comprimento do código OTP (split-flap de 6 dígitos). */
export const OTP_LENGTH = 6;

/** Último dígito numérico de um input de célula; vazio se não houver dígito. */
export function otpDigit(raw: string): string {
  return raw.replace(/\D/g, "").slice(-1);
}

/**
 * Dígitos colados num campo, divididos em células — só vale uma colagem que
 * traga exatamente OTP_LENGTH dígitos (após remover não-numéricos); senão null.
 */
export function otpFromPaste(raw: string): string[] | null {
  const digits = raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
  return digits.length === OTP_LENGTH ? digits.split("") : null;
}

/** Código completo = OTP_LENGTH células, todas preenchidas. */
export function otpIsComplete(code: string[]): boolean {
  return code.length === OTP_LENGTH && code.every((d) => d !== "");
}
