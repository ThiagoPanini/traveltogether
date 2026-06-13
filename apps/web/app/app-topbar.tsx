import Link from "next/link";

import { getAuthSession } from "@/auth";
import { Icon, UserAvatar } from "@/components/atlas";
import { getCurrentUser } from "@/lib/api/current-user";
import { displayLabel } from "@/lib/identity/user-display";

import { LogoutButton } from "./logout-button";
import { UtcClock } from "./utc-clock";

interface Props {
  active?: "trips";
}

export async function AppTopbar({ active }: Props) {
  const session = await getAuthSession();
  const user = await getCurrentUser(session?.apiAccessToken);

  return (
    <header className="topbar">
      <div className="shell topbar-in">
        <Link className="brand" href="/trips">
          <span className="brand-mark">
            <Icon name="plane" size={14} />
          </span>
          travel<em>together</em>
        </Link>
        <nav className="topnav">
          <Link className={active === "trips" ? "active" : ""} href="/trips">
            Viagens
          </Link>
        </nav>
        <div className="topbar-right">
          <UtcClock />
          <Link
            href="/profile"
            title={user ? displayLabel(user) : "Perfil & conta"}
            style={{ display: "inline-flex" }}
          >
            {user ? (
              <UserAvatar
                avatarUrl={user.avatar_url}
                label={displayLabel(user)}
                seed={user.id}
                size={32}
              />
            ) : (
              <span className="avatar">TT</span>
            )}
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
