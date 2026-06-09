import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session) redirect("/");

  return (
    <main className="auth-shell">
      <LoginForm />
    </main>
  );
}
