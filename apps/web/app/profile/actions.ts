"use server";

import type { UserUpdate } from "@traveltogether/types";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { updateProfile } from "@/lib/api/current-user";

export async function updateProfileAction(patch: UserUpdate) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  return updateProfile(session.apiAccessToken, patch);
}
