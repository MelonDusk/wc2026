import { NextResponse } from "next/server";
import { getFixtures, fixturesTtlSeconds } from "@/lib/worldcupapi";
import type { FixturesPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/fixtures
 * Proxy + cache de la liste des matchs à élimination directe.
 * Le Edge Cache Vercel absorbe le trafic via s-maxage :
 * quel que soit le nombre de visiteurs, API-Football n'est
 * appelée qu'une fois par intervalle de TTL.
 */
export async function GET() {
  try {
    const { fixtures, stale } = await getFixtures();
    const ttl = fixturesTtlSeconds(fixtures);
    const payload: FixturesPayload = {
      fixtures,
      updatedAt: new Date().toISOString(),
      stale,
    };
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`,
      },
    });
  } catch {
    // Aucun cache disponible et API en échec : réponse vide + flag stale,
    // le client affiche le bandeau "données en cours de rafraîchissement".
    const payload: FixturesPayload = {
      fixtures: [],
      updatedAt: new Date().toISOString(),
      stale: true,
    };
    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" },
    });
  }
}
