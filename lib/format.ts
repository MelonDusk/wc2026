import { SlimFixture, isLive, isFinished } from "./types";
import { STADIUM_TIMEZONE } from "./venues";

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

/** UTC offset (ms) of an IANA timezone at a given instant — DST-aware. */
function tzOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) parts[p.type] = p.value;
  const asIfUtc = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second
  );
  return asIfUtc - utcMs;
}

/**
 * The REAL kickoff instant (true UTC ms), resolved via the stadium's actual
 * IANA timezone (stadiumId -> STADIUM_TIMEZONE, see lib/venues.ts) rather
 * than guessing dateLocal is UTC or the viewer's own zone. This is the only
 * approach that's actually correct for every viewer everywhere — it
 * accounts for each host city's real DST status on the match date. Returns
 * null if the stadium is unmapped or dateLocal is unparsable (the caller
 * should treat that fixture as "can't countdown to this one").
 */
export function realKickoffInstant(dateLocal: string, stadiumId: string | null): number | null {
  const m = dateLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const timeZone = stadiumId ? STADIUM_TIMEZONE[stadiumId] : undefined;
  if (!timeZone) return null;
  const [, y, mo, d, h, min] = m;
  const guess = Date.UTC(+y, +mo - 1, +d, +h, +min);
  return guess - tzOffsetMs(guess, timeZone);
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
