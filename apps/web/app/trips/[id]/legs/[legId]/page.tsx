import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { getFares } from "@/lib/api/fares";
import { getTrip } from "@/lib/api/trips";
import FaresPanel from "./fares-panel";

interface Props {
  params: Promise<{ id: string; legId: string }>;
}

export default async function LegFaresPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id, legId } = await params;
  const [data, fares] = await Promise.all([
    getTrip(session.apiAccessToken, id),
    getFares(session.apiAccessToken, legId),
  ]);
  if (!data) notFound();

  const { trip, membership } = data;

  return (
    <main className="trips-shell">
      <header className="trips-header">
        <div>
          <p className="eyebrow">
            <Link href={`/trips/${id}`}>← {trip.name}</Link>
          </p>
          <h1>Pesquisas de Passagem</h1>
        </div>
      </header>

      <FaresPanel
        legId={legId}
        initialFares={fares}
        role={membership.role}
        accessToken={session.apiAccessToken}
      />
    </main>
  );
}
