import { SlimFixture, isLive, isFinished } from "./types";

/* ------------------------------------------------------------------ */
/* Types du squelette statique (data/bracket-skeleton.json)            */
/* Chaque slot est ANCRÉ sur un id de match worldcup26.ir :            */
/*   73-88 = R32, 89-96 = R16, 97-100 = QF, 101-102 = SF, 104 = finale */
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
  round_of_32: "R32",
  round_of_16: "R16",
  quarter_finals: "QF",
  semi_finals: "SF",
  final: "F",
};

export const ROUND_LABEL_FR: Record<string, string> = {
  "Round of 32": "Seizièmes de finale",
  "Round of 16": "Huitièmes de finale",
  "Quarter-finals": "Quarts de finale",
  "Semi-finals": "Demi-finales",
  "3rd Place Final": "Petite finale",
  Final: "Finale",
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
    if (f.round === "3rd Place Final") continue;
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

/* ------------------------------------------------------------------ */
/* Couleur dominante du drapeau (lignes de progression)                */
/* Noms anglais tels que renvoyés par worldcup26.ir                    */
/* ------------------------------------------------------------------ */

const TEAM_COLORS: Record<string, string> = {
  France: "#1c3faa", Senegal: "#12a04b", Spain: "#d81e2a", Uruguay: "#7fb4e0",
  Argentina: "#75aadb", Mexico: "#046a38", England: "#d81e2a", Japan: "#bc002d",
  Brazil: "#f7d117", Switzerland: "#d81e2a", Portugal: "#046a38",
  "South Korea": "#c60c30", "Korea Republic": "#c60c30",
  Germany: "#ffce00", Morocco: "#c1272d", Netherlands: "#ff7f00",
  USA: "#3c3b6e", "United States": "#3c3b6e",
  Belgium: "#fdda24", Australia: "#ffcd00", Croatia: "#d81e2a", Canada: "#d81e2a",
  Italy: "#008c45", Ecuador: "#ffdd00", Colombia: "#fcd116", Denmark: "#c8102e",
  Norway: "#ba0c2f", Ghana: "#fcd116", Austria: "#ed2939", Iran: "#239f40",
  Scotland: "#005eb8", Panama: "#005293", Uzbekistan: "#0099b5", Jordan: "#ce1126",
  Turkey: "#e30a17", Türkiye: "#e30a17",
  "Democratic Republic of the Congo": "#007fff", "DR Congo": "#007fff",
  Curaçao: "#002b7f", Curacao: "#002b7f",
  "Cape Verde": "#003893", "Cabo Verde": "#003893",
  Qatar: "#8a1538", "Saudi Arabia": "#165d31", Tunisia: "#e70013",
  Algeria: "#006233", Egypt: "#ce1126", "South Africa": "#007749",
  "Ivory Coast": "#f77f00", "Côte d'Ivoire": "#f77f00",
  Paraguay: "#d52b1e", Haiti: "#00209f", Honduras: "#0073cf",
  "New Zealand": "#000000", "Costa Rica": "#002b7f", Jamaica: "#009b3a",
};

export function teamColor(name: string): string {
  return TEAM_COLORS[name] ?? "#d4af37";
}
