import fs from "node:fs";
import path from "node:path";
import { SlimFixture, SlimEvent, SlimTeam, isLive, isFinished } from "./types";
import { parseScorers, parseLocalDate, parseStatus, parseNum } from "./parse";

const API_URL = "https://worldcup26.ir/get/games";

/* ------------------------------------------------------------------ */
/* Tours ancrés par id de match (mapping déterministe)                 */
/*   1-72 phase de groupes · 73-88 Round of 32 · 89-96 Round of 16     */
/*   97-100 quarts · 101-102 demies · 103 petite finale · 104 finale   */
/* ------------------------------------------------------------------ */

export function roundFromId(id: number): string | null {
  if (id >= 1 && id <= 72) return "Group Stage";
  if (id >= 73 && id <= 88) return "Round of 32";
  if (id >= 89 && id <= 96) return "Round of 16";
  if (id >= 97 && id <= 100) return "Quarter-finals";
  if (id >= 101 && id <= 102) return "Semi-finals";
  if (id === 103) return "3rd Place Final";
  if (id === 104) return "Final";
  return null;
}

/* ------------------------------------------------------------------ */
/* Cache mémoire in-function (même rôle qu'avant : éviter les doubles  */
/* appels dans une instance ; le Edge Cache Vercel reste le bouclier)  */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  games: SlimFixture[];
  scorersByGame: Map<number, SlimEvent[]>;
  storedAt: number;
  ttlMs: number;
}

let memCache: CacheEntry | null = null;

/* ------------------------------------------------------------------ */
/* TTL selon l'état des matchs (stratégie inchangée)                   */
/*   terminé 6 h · live 60 s · à venir 1 h                             */
/* ------------------------------------------------------------------ */

export const TTL = {
  FINISHED: 6 * 3600,
  LIVE: 60,
  UPCOMING: 3600,
} as const;

export function fixturesTtlSeconds(fixtures: SlimFixture[]): number {
  if (fixtures.some((f) => isLive(f.status))) return TTL.LIVE;
  if (fixtures.some((f) => !isFinished(f.status))) return TTL.UPCOMING;
  return TTL.FINISHED;
}

/* ------------------------------------------------------------------ */
/* Normalisation d'un match brut worldcup26.ir                         */
/* Codé défensivement : noms de champs alternatifs tolérés.            */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */

function pick(raw: any, keys: string[]): unknown {
  for (const k of keys) {
    if (raw[k] != null && raw[k] !== "") return raw[k];
  }
  return null;
}

function teamOf(raw: any, side: "home" | "away"): SlimTeam | null {
  const id = parseNum(pick(raw, [`${side}_team_id`, `${side}_id`]));
  if (!id || id === 0) return null; // "0" = équipe pas encore connue
  const name = pick(raw, [
    `${side}_team_name_en`,
    `${side}_team_name`,
    `${side}_team`,
    `${side}_name`,
    `${side}_team_en`,
    `${side}_team_title`,
  ]);
  return {
    id,
    name: typeof name === "string" ? name : `Team ${id}`,
  };
}

function labelOf(raw: any, side: "home" | "away"): string | null {
  const l = pick(raw, [`${side}_team_label`, `${side}_label`, `${side}_placeholder`]);
  return typeof l === "string" ? l : null;
}

interface NormalizedGame {
  fixture: SlimFixture;
  events: SlimEvent[];
}

function normalizeGame(raw: any): NormalizedGame | null {
  const id = parseNum(raw.id ?? raw.game_id ?? raw.match_id);
  if (id == null) return null;
  const round = roundFromId(id);
  if (round == null) return null; // groupes exclus

  const home = teamOf(raw, "home");
  const away = teamOf(raw, "away");
  const { status, elapsed } = parseStatus(
    pick(raw, ["finished", "status", "state"]),
    pick(raw, ["time_elapsed", "elapsed", "minute"])
  );
  // Les matchs non joués arrivent avec "0"-"0" : ne pas les afficher comme un vrai score
  let homeScore = parseNum(pick(raw, ["home_score", "home_team_score", "home_goals"]));
  let awayScore = parseNum(pick(raw, ["away_score", "away_team_score", "away_goals"]));
  if (status === "NS") {
    homeScore = null;
    awayScore = null;
  }
  const homePen = parseNum(pick(raw, ["home_penalty_score", "home_penalties"]));
  const awayPen = parseNum(pick(raw, ["away_penalty_score", "away_penalties"]));

  let winnerId: number | null = null;
  if (status === "FT" && home && away && homeScore != null && awayScore != null) {
    if (homeScore > awayScore) winnerId = home.id;
    else if (awayScore > homeScore) winnerId = away.id;
    else if (homePen != null && awayPen != null) {
      winnerId = homePen > awayPen ? home.id : awayPen > homePen ? away.id : null;
    }
  }

  const events = [
    ...(home ? parseScorers(pick(raw, ["home_scorers"]), home.id) : []),
    ...(away ? parseScorers(pick(raw, ["away_scorers"]), away.id) : []),
  ].sort((a, b) => a.minute - b.minute || (a.extra ?? 0) - (b.extra ?? 0));

  return {
    fixture: {
      id,
      round,
      dateLocal: parseLocalDate(pick(raw, ["local_date", "date"])) ?? "",
      stadiumId: (() => {
        const s = pick(raw, ["stadium_id"]);
        return s == null ? null : String(s);
      })(),
      status,
      elapsed,
      home,
      away,
      homeLabel: labelOf(raw, "home"),
      awayLabel: labelOf(raw, "away"),
      homeScore,
      awayScore,
      homePen,
      awayPen,
      winnerId,
    },
    events,
  };
}

/* ------------------------------------------------------------------ */
/* Récupération (API publique, pas de clé) + mode mock                 */
/* ------------------------------------------------------------------ */

function useMock(): boolean {
  return process.env.USE_MOCK === "1";
}

async function fetchRawGames(): Promise<any[]> {
  if (useMock()) {
    const p = path.join(process.cwd(), "data", "mock-games.json");
    const json = JSON.parse(fs.readFileSync(p, "utf-8"));
    return json.games ?? [];
  }
  const res = await fetch(API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`worldcup26.ir HTTP ${res.status}`);
  const json = (await res.json()) as { games?: any[] };
  if (!Array.isArray(json.games)) throw new Error("worldcup26.ir : format inattendu");
  return json.games;
}

async function loadAll(): Promise<{ entry: CacheEntry; stale: boolean }> {
  if (memCache && Date.now() - memCache.storedAt < memCache.ttlMs) {
    return { entry: memCache, stale: false };
  }
  try {
    const raw = await fetchRawGames();
    const games: SlimFixture[] = [];
    const scorersByGame = new Map<number, SlimEvent[]>();
    for (const g of raw) {
      const n = normalizeGame(g);
      if (n) {
        games.push(n.fixture);
        scorersByGame.set(n.fixture.id, n.events);
      }
    }
    games.sort((a, b) => a.id - b.id);
    memCache = {
      games,
      scorersByGame,
      storedAt: Date.now(),
      ttlMs: fixturesTtlSeconds(games) * 1000,
    };
    return { entry: memCache, stale: false };
  } catch (err) {
    // API indisponible : servir le stale, jamais d'erreur brute
    if (memCache) return { entry: memCache, stale: true };
    throw err;
  }
}

export async function getFixtures(): Promise<{ fixtures: SlimFixture[]; stale: boolean }> {
  const { entry, stale } = await loadAll();
  return { fixtures: entry.games, stale };
}

/** Les buteurs viennent du même payload : aucun appel supplémentaire */
export async function getEvents(
  fixtureId: number
): Promise<{ events: SlimEvent[]; stale: boolean }> {
  const { entry, stale } = await loadAll();
  return { events: entry.scorersByGame.get(fixtureId) ?? [], stale };
}
