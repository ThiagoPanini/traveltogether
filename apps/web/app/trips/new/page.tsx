import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";

import { NewTripForm } from "./new-trip-form";

export default async function NewTripPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  return (
    <main className="auth-shell">
      <NewTripForm accessToken={session.apiAccessToken} />
    </main>
  );
}
