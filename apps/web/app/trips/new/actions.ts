"use server";

import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { createTrip } from "@/lib/api/trips";

export async function createTripAction(data: {
  name: string;
  description: string;
  origin: string;
  airport_code?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return createTrip(session.apiAccessToken, data);
}
