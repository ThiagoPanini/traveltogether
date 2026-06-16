// Lógica pura do fluxo de Login em passos (#134): máquina choose → email → code
// e o cronômetro de expiração (TTL) do código. Sem React, sem DOM — testável.

/** Validade do código OTP no fluxo de Login, em segundos (espelha o protótipo). */
export const CODE_TTL_SECONDS = 300;

/** Janela inicial (segundos) em que o reenvio fica bloqueado após o envio. */
export const RESEND_LOCK_SECONDS = 20;

export type LoginStep = "choose" | "email" | "code";

export type LoginEvent =
  | { type: "chooseEmail" } // choose → email
  | { type: "codeSent" } // email → code (código enviado)
  | { type: "changeEmail" } // code → email (trocar e-mail)
  | { type: "backToChoose" }; // email → choose (outras formas de entrar)

export function loginStep(current: LoginStep, event: LoginEvent): LoginStep {
  switch (event.type) {
    case "chooseEmail":
      return "email";
    case "codeSent":
      return "code";
    case "changeEmail":
      return "email";
    case "backToChoose":
      return "choose";
    default:
      return current;
  }
}

// Validação leve de e-mail só para habilitar o botão "Enviar código" (a
// verdade é o backend). Ignora espaços nas bordas; exige local@dominio.tld.
export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

// Reenvio liberado quando o código expirou ou quando já passou a janela de
// bloqueio inicial (evita spam logo após o primeiro envio).
export function canResend(seconds: number, expired: boolean): boolean {
  return expired || seconds <= CODE_TTL_SECONDS - RESEND_LOCK_SECONDS;
}

/** TTL restante formatado como `mm:ss` (negativos viram "00:00"). */
export function formatTtl(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
