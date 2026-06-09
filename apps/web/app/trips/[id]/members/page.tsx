import { notFound, redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { getTrip, getTripMembers } from "@/lib/api/trips";

import { MembersPanel } from "./members-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripMembersPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id } = await params;
  const [data, members] = await Promise.all([
    getTrip(session.apiAccessToken, id),
    getTripMembers(session.apiAccessToken, id),
  ]);

  if (!data || !members) notFound();

  const { trip, membership } = data;
  const isOrganizer = membership.role === "organizer";

  return (
    <main className="trips-shell">
      <header className="trips-header">
        <div>
          <p className="eyebrow">
            <a href={`/trips/${id}`}>← {trip.name}</a>
          </p>
          <h1>Membros</h1>
        </div>
      </header>

      <MembersPanel
        accessToken={session.apiAccessToken}
        tripId={id}
        members={members.members}
        pending={members.pending}
        isOrganizer={isOrganizer}
      />
    </main>
  );
}
