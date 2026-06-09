import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { getFares, getUpvote } from "@/lib/api/fares";
import { getTrip } from "@/lib/api/trips";
import type { FareRow } from "@/lib/compare-fares";
import ComparePanel from "./compare-panel";

interface Props {
  params: Promise<{ id: string; legId: string }>;
}

export default async function ComparePage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id, legId } = await params;
  const [data, fares] = await Promise.all([
    getTrip(session.apiAccessToken, id),
    getFares(session.apiAccessToken, legId),
  ]);
  if (!data) notFound();

  const token = session.apiAccessToken;
  const upvotes = await Promise.all(fares.map((f) => getUpvote(token, f.id)));

  const rows: FareRow[] = fares.map((f, i) => ({
    ...f,
    upvote_count: upvotes[i]?.count ?? 0,
  }));

  const { trip, membership } = data;

  return (
    <main className="trips-shell">
      <header className="trips-header">
        <div>
          <p className="eyebrow">
            <Link href={`/trips/${id}/legs/${legId}`}>← Passagens</Link>
          </p>
          <h1>Comparar Pesquisas</h1>
          <p className="trips-empty">{trip.name}</p>
        </div>
      </header>

      <ComparePanel legId={legId} initialRows={rows} role={membership.role} />
    </main>
  );
}
