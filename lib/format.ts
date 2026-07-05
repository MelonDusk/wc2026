import { SlimFixture, isLive, isFinished } from "./types";

/** Statut affiché : "Terminé", "En cours 63'", "Sam. 11 juil. 21:00" */
export function formatStatus(f: SlimFixture): string {
  if (isFinished(f.status)) {
    if (f.homePen != null && f.awayPen != null) return "Terminé (t.a.b.)";
    return "Terminé";
  }
  if (isLive(f.status)) {
    return f.elapsed != null ? `En cours ${f.elapsed}'` : "En cours";
  }
  return formatKickoff(f.dateLocal);
}

/**
 * Coup d'envoi. dateLocal est l'heure LOCALE DU STADE sans fuseau
 * ("2026-07-11T18:00") : on l'affiche telle quelle, sans conversion.
 */
export function formatKickoff(dateLocal: string): string {
  const m = dateLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return dateLocal || "Date à confirmer";
  const [, y, mo, d, h, min] = m;
  // Date en UTC + affichage en UTC = aucun décalage appliqué
  const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +min));
  const s = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(dt);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Score du drawer, t.a.b. inclus : "1 – 1, 3 – 4 t.a.b." */
export function formatScoreWithPens(f: SlimFixture): string | null {
  if (f.homeScore == null || f.awayScore == null) return null;
  const base = `${f.homeScore} – ${f.awayScore}`;
  if (f.homePen != null && f.awayPen != null) {
    return `${base}, ${f.homePen} – ${f.awayPen} t.a.b.`;
  }
  return base;
}

/** Initiales de repli tant que la source des drapeaux n'est pas tranchée */
export function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
