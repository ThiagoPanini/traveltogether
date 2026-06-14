const apiUrl = () => process.env.TRAVELTOGETHER_API_URL ?? "http://localhost:8000";

export interface OtpVerifyResult {
  valid: boolean;
  email: string | null;
}

export async function requestOtp(email: string): Promise<boolean> {
  const res = await fetch(`${apiUrl()}/identity/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}

export async function verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
  const res = await fetch(`${apiUrl()}/identity/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  return (await res.json()) as OtpVerifyResult;
}
