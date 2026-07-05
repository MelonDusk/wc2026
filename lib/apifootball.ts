import fs from "node:fs";
import path from "node:path";
import {
  SlimFixture,
  SlimEvent,
  isLive,
  isFinished,
} from "./types";

const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1; // FIFA World Cup
const SEASON = 2026;

/** Tours de la phase à élimination directe (hors périmètre : phase de groupes) */
const KO_ROUNDS = new Set([
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "3rd Place Final",
  "Final",
]);

/* ------------------------------------------------------------------ */
/* Cache mémoire in-function (par instance serverless)                 */
/* Le vrai bouclier est le Edge Cache Vercel via s-maxage ;            */
/* ce cache mémoire évite les doubles appels dans une même instance.   */
/* ------------------------------------------------------------------ */

interface CacheEntry<T> {
  data: T;
  storedAt: number; // epoch ms
  ttlMs: number;
}

const memCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): { data: T; fresh: boolean } | null {
  const entry = memCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return { data: entry.data, fresh: Date.now() - entry.storedAt < entry.ttlMs };
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  memCache.set(key, { data, storedAt: Date.now(), ttlMs });
}

/* ------------------------------------------------------------------ */
/* TTL selon l'état des matchs (règle d'or du cahier des charges)      */
/* ------------------------------------------------------------------ */

export const TTL = {
  FINISHED: 6 * 3600, // 6 h : le résultat ne changera plus
  LIVE: 60, // 60 s : suivi quasi-live
  UPCOMING: 3600, // 1 h : seule l'heure du coup d'envoi compte
} as const;

export function fixturesTtlSeconds(fixtures: SlimFixture[]): number {
  if (fixtures.some((f) => isLive(f.status))) return TTL.LIVE;
  if (fixtures.some((f) => !isFinished(f.status))) return TTL.UPCOMING;
  return TTL.FINISHED;
}

/* ------------------------------------------------------------------ */
/* Mode mock (USE_MOCK=1) : fixtures factices, zéro requête API        */
/* ------------------------------------------------------------------ */

function useMock(): boolean {
  return process.env.USE_MOCK === "1";
}

function readMockJson<T>(file: string): T {
  const p = path.join(process.cwd(), "data", file);
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

/* ------------------------------------------------------------------ */
/* Appels API-Football (jamais côté client : la clé reste serveur)     */
/* ------------------------------------------------------------------ */

async function apiFetch(endpoint: string): Promise<unknown> {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) throw new Error("APIFOOTBALL_KEY manquante");
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "x-apisports-key": key },
    // Le cache HTTP est géré par nos routes, pas par fetch
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football HTTP ${res.status}`);
  const json = (await res.json()) as { errors?: unknown; response?: unknown };
  const errs = json.errors;
  if (errs && (Array.isArray(errs) ? errs.length > 0 : Object.keys(errs as object).length > 0)) {
    throw new Error(`API-Football errors: ${JSON.stringify(errs)}`);
  }
  return json.response;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function toSlimFixture(raw: any): SlimFixture {
  const goals = raw.goals ?? {};
  const pen = raw.score?.penalty ?? {};
  const homeWinner: boolean | null = raw.teams?.home?.winner ?? null;
  const awayWinner: boolean | null = raw.teams?.away?.winner ?? null;
  let winnerId: number | null = null;
  if (homeWinner === true) winnerId = raw.teams.home.id;
  else if (awayWinner === true) winnerId = raw.teams.away.id;
  return {
    id: raw.fixture.id,
    round: raw.league?.round ?? "",
    date: raw.fixture.date,
    status: raw.fixture.status?.short ?? "NS",
    elapsed: raw.fixture.status?.elapsed ?? null,
    home: { id: raw.teams.home.id, name: raw.teams.home.name },
    away: { id: raw.teams.away.id, name: raw.teams.away.name },
    homeScore: goals.home ?? null,
    awayScore: goals.away ?? null,
    homePen: pen.home ?? null,
    awayPen: pen.away ?? null,
    winnerId,
  };
}

function toSlimEvent(raw: any): SlimEvent {
  const t = String(raw.type ?? "").toLowerCase();
  let type: SlimEvent["type"] = "other";
  if (t === "goal") type = "goal";
  else if (t === "card") type = "card";
  else if (t === "subst") type = "subst";
  else if (t === "var") type = "var";
  return {
    minute: raw.time?.elapsed ?? 0,
    extra: raw.time?.extra ?? null,
    type,
    detail: raw.detail ?? "",
    teamId: raw.team?.id ?? 0,
    player: raw.player?.name ?? null,
    assist: raw.assist?.name ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Fonctions publiques utilisées par les routes API                    */
/* ------------------------------------------------------------------ */

export async function getFixtures(): Promise<{
  fixtures: SlimFixture[];
  stale: boolean;
}> {
  const cacheKey = "fixtures";

  if (useMock()) {
    const raw = readMockJson<any[]>("mock-fixtures.json");
    const fixtures = raw.map(toSlimFixture).filter((f) => KO_ROUNDS.has(f.round));
    return { fixtures, stale: false };
  }

  const cached = getCached<SlimFixture[]>(cacheKey);
  if (cached?.fresh) return { fixtures: cached.data, stale: false };

  try {
    const raw = (await apiFetch(
      `/fixtures?league=${LEAGUE_ID}&season=${SEASON}`
    )) as any[];
    const fixtures = raw.map(toSlimFixture).filter((f) => KO_ROUNDS.has(f.round));
    setCached(cacheKey, fixtures, fixturesTtlSeconds(fixtures) * 1000);
    return { fixtures, stale: false };
  } catch (err) {
    // API indisponible ou 429 : servir le stale, jamais d'erreur brute
    if (cached) return { fixtures: cached.data, stale: true };
    throw err;
  }
}

export async function getEvents(
  fixtureId: number
): Promise<{ events: SlimEvent[]; stale: boolean }> {
  const cacheKey = `events:${fixtureId}`;

  if (useMock()) {
    const all = readMockJson<Record<string, any[]>>("mock-events.json");
    const raw = all[String(fixtureId)] ?? [];
    return { events: raw.map(toSlimEvent), stale: false };
  }

  const cached = getCached<SlimEvent[]>(cacheKey);
  if (cached?.fresh) return { events: cached.data, stale: false };

  try {
    const raw = (await apiFetch(
      `/fixtures/events?fixture=${fixtureId}`
    )) as any[];
    const events = raw.map(toSlimEvent);
    // TTL affiné par la route selon le statut du match ; ici valeur médiane
    setCached(cacheKey, events, TTL.LIVE * 1000);
    return { events, stale: false };
  } catch (err) {
    if (cached) return { events: cached.data, stale: true };
    throw err;
  }
}
