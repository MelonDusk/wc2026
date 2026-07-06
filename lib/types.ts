/** Statut normalisé d'un match worldcup26.ir */
export type FixtureStatus = "FT" | "NS" | "LIVE";

export interface SlimTeam {
  id: number;
  name: string;
}

/** Fixture aplati : l'overlay vivant du bracket */
export interface SlimFixture {
  id: number;
  round: string; // "Round of 32" | "Round of 16" | "Quarter-finals" | "Semi-finals" | "3rd Place Final" | "Final"
  /** Heure locale du stade, SANS fuseau : "2026-07-11T18:00" (local_date de l'API, format US MM/DD/YYYY) */
  dateLocal: string;
  /** id numérique brut de l'API — voir lib/venues.ts pour résoudre le fuseau réel */
  stadiumId: string | null;
  status: FixtureStatus;
  elapsed: number | null;
  /** null si l'équipe n'est pas encore connue (team_id "0") → utiliser le label */
  home: SlimTeam | null;
  away: SlimTeam | null;
  /** ex. "Winner Match 74" quand l'équipe est inconnue */
  homeLabel: string | null;
  awayLabel: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePen: number | null;
  awayPen: number | null;
  winnerId: number | null;
}

export interface SlimEvent {
  minute: number;
  extra: number | null; // temps additionnel : 45+5 → minute=45, extra=5
  type: "goal";
  detail: "Normal Goal" | "Penalty" | "Own Goal";
  teamId: number;
  player: string | null;
  assist: string | null; // non fourni par worldcup26.ir
}

export interface FixturesPayload {
  fixtures: SlimFixture[];
  updatedAt: string;
  stale: boolean;
}

export interface EventsPayload {
  fixtureId: number;
  events: SlimEvent[];
  updatedAt: string;
  stale: boolean;
}

export function isLive(status: FixtureStatus): boolean {
  return status === "LIVE";
}

export function isFinished(status: FixtureStatus): boolean {
  return status === "FT";
}
