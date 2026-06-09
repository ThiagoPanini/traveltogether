"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      className="secondary-button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sair
    </button>
  );
}
