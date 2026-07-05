import { NextRequest, NextResponse } from "next/server";
import { getEvents, TTL } from "@/lib/worldcupapi";
import type { EventsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/match/[id]?state=finished|live|upcoming
 * Events d'un match (buts, cartons, remplacements), à la demande.
 * Le client transmet l'état connu du match pour affiner le TTL :
 *   terminé → 6 h, en cours → 60 s, à venir → 1 h.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fixtureId = Number(id);
  if (!Number.isInteger(fixtureId) || fixtureId <= 0) {
    return NextResponse.json({ error: "id invalide" }, { status: 400 });
  }

  const state = req.nextUrl.searchParams.get("state");
  const ttl =
    state === "finished" ? TTL.FINISHED : state === "live" ? TTL.LIVE : TTL.UPCOMING;

  try {
    const { events, stale } = await getEvents(fixtureId);
    const payload: EventsPayload = {
      fixtureId,
      events,
      updatedAt: new Date().toISOString(),
      stale,
    };
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`,
      },
    });
  } catch {
    const payload: EventsPayload = {
      fixtureId,
      events: [],
      updatedAt: new Date().toISOString(),
      stale: true,
    };
    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" },
    });
  }
}
