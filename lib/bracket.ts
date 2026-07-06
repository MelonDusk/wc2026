import { SlimFixture, isLive, isFinished } from "./types";

/* ------------------------------------------------------------------ */
/* Types du squelette statique (data/bracket-skeleton.json)            */
/* Le bracket radial démarre aux huitièmes : R32 et la phase de        */
/* groupes ne sont PAS dans le squelette (donc pas dessinés), mais     */
/* restent accessibles via /api/fixtures pour le drawer.               */
/* Chaque slot est ANCRÉ sur un id de match worldcup26.ir :            */
/*   89-96 = R16, 97-100 = QF, 101-102 = SF, 104 = finale              */
/* (103, la petite finale, n'a pas de slot sur le bracket)             */
/* ------------------------------------------------------------------ */

export interface SkeletonMatch {
  slot: number;
  fixtureId: number; // id de match worldcup26.ir — mapping déterministe
  angle: number; // degrés, 0 = haut, sens horaire
  feedsInto: string | null;
}

export interface SkeletonRound {
  name: string;
  radius: number;
  matches: SkeletonMatch[];
}

export interface BracketSkeleton {
  rounds: SkeletonRound[];
}

export interface ResolvedMatch {
  key: string;
  roundName: string;
  angle: number;
  radius: number;
  feedsInto: string | null;
  fixture: SlimFixture | null;
}

const ROUND_PREFIX: Record<string, string> = {
  round_of_16: "R16",
  quarter_finals: "QF",
  semi_finals: "SF",
  final: "F",
};

export const ROUND_LABEL_EN: Record<string, string> = {
  "Group Stage": "Group Stage",
  "Round of 32": "Round of 32",
  "Round of 16": "Round of 16",
  "Quarter-finals": "Quarter-finals",
  "Semi-finals": "Semi-finals",
  "3rd Place Final": "Third-Place Playoff",
  Final: "Final",
};

/* ------------------------------------------------------------------ */
/* Trigonométrie : x = cx + r·R·sin(θ), y = cy − r·R·cos(θ)            */
/* ------------------------------------------------------------------ */

export function polarToXY(
  angleDeg: number,
  radiusFrac: number,
  cx: number,
  cy: number,
  R: number
): { x: number; y: number } {
  const theta = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radiusFrac * R * Math.sin(theta),
    y: cy - radiusFrac * R * Math.cos(theta),
  };
}

/* ------------------------------------------------------------------ */
/* Mapping fixtures → slots : lookup direct par id, zéro heuristique   */
/* ------------------------------------------------------------------ */

export function resolveBracket(
  skeleton: BracketSkeleton,
  fixtures: SlimFixture[]
): ResolvedMatch[] {
  const byId = new Map<number, SlimFixture>();
  for (const f of fixtures) byId.set(f.id, f);

  const resolved: ResolvedMatch[] = [];
  for (const round of skeleton.rounds) {
    const prefix = ROUND_PREFIX[round.name] ?? round.name;
    for (const m of round.matches) {
      resolved.push({
        key: `${prefix}-${m.slot}`,
        roundName: round.name,
        angle: m.angle,
        radius: round.radius,
        feedsInto: m.feedsInto,
        fixture: byId.get(m.fixtureId) ?? null,
      });
    }
  }
  return resolved;
}

/* ------------------------------------------------------------------ */
/* États des équipes                                                   */
/* ------------------------------------------------------------------ */

export interface TeamStates {
  eliminated: Set<number>;
  live: Set<number>;
  champion: number | null;
}

export function computeTeamStates(fixtures: SlimFixture[]): TeamStates {
  const eliminated = new Set<number>();
  const live = new Set<number>();
  let champion: number | null = null;

  for (const f of fixtures) {
    if (f.round === "3rd Place Final" || f.round === "Group Stage") continue;
    if (isFinished(f.status) && f.winnerId != null && f.home && f.away) {
      const loser = f.winnerId === f.home.id ? f.away.id : f.home.id;
      eliminated.add(loser);
      if (f.round === "Final") champion = f.winnerId;
    }
    if (isLive(f.status)) {
      if (f.home) live.add(f.home.id);
      if (f.away) live.add(f.away.id);
    }
  }
  return { eliminated, live, champion };
}
