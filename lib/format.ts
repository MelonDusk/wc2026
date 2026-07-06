import { SlimFixture, isLive, isFinished } from "./types";

/** Displayed status: "Full-time", "Live 63'", "Sat, 11 Jul, 21:00" */
export function formatStatus(f: SlimFixture): string {
  if (isFinished(f.status)) {
    if (f.homePen != null && f.awayPen != null) return "Full-time (pens)";
    return "Full-time";
  }
  if (isLive(f.status)) {
    return f.elapsed != null ? `Live ${f.elapsed}'` : "Live";
  }
  return formatKickoff(f.dateLocal);
}

/**
 * Kickoff instant in ms, treating dateLocal's components as UTC. The
 * stadium's real UTC offset isn't in the data, so this is an approximation
 * by design — applied consistently everywhere (display and countdowns
 * alike), so every viewer sees the same numbers regardless of their own
 * timezone.
 */
export function kickoffInstant(dateLocal: string): number | null {
  const m = dateLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, min] = m;
  return Date.UTC(+y, +mo - 1, +d, +h, +min);
}

/**
 * Kickoff time. dateLocal is the STADIUM'S LOCAL time with no timezone
 * ("2026-07-11T18:00"): displayed as-is, no conversion applied.
 */
export function formatKickoff(dateLocal: string): string {
  const instant = kickoffInstant(dateLocal);
  if (instant == null) return dateLocal || "Date to be confirmed";
  const s = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(instant);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Drawer score, including penalties: "1 – 1, 3 – 4 pens" */
export function formatScoreWithPens(f: SlimFixture): string | null {
  if (f.homeScore == null || f.awayScore == null) return null;
  const base = `${f.homeScore} – ${f.awayScore}`;
  if (f.homePen != null && f.awayPen != null) {
    return `${base}, ${f.homePen} – ${f.awayPen} pens`;
  }
  return base;
}

/** Fallback initials while the flag source is unresolved */
export function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
