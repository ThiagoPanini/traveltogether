"use server";

// Solicitação de código OTP. Server Action porque é disparada de um Client
// Component (login-form/code-step): `process.env.TRAVELTOGETHER_API_URL` só existe no
// servidor — no browser seria `undefined` e cairia no fallback localhost.

export async function requestOtp(email: string): Promise<boolean> {
  const apiUrl = process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";
  const res = await fetch(`${apiUrl}/identity/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}
