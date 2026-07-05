/**
 * Parseurs purs (sans dépendance) pour les données worldcup26.ir.
 * Testés par scripts/test-parse.ts (`npm run test:parse`).
 */
/** Structurellement identique à SlimEvent (lib/types) — défini ici pour
 * que ce module reste pur et testable par Node sans résolution d'alias. */
export interface GoalEvent {
  minute: number;
  extra: number | null;
  type: "goal";
  detail: "Normal Goal" | "Penalty" | "Own Goal";
  teamId: number;
  player: string | null;
  assist: string | null;
}

/* ------------------------------------------------------------------ */
/* Buteurs : home_scorers / away_scorers sont des CHAÎNES au format    */
/*   "{"Nom 45'","Nom 90+8' (p)"}"                                     */
/* avec guillemets courbes OU droits échappés, et "null" littéral.     */
/* ------------------------------------------------------------------ */

/** Normalise tous les types de guillemets vers le guillemet droit " */
function normalizeQuotes(s: string): string {
  return s
    .replace(/\\"/g, '"') // guillemets droits échappés
    .replace(/[“”„‟«»]/g, '"') // “ ” „ ‟ « »
    .replace(/[‘’]/g, "'"); // apostrophes courbes → droites
}

interface ParsedScorer {
  player: string;
  minute: number;
  extra: number | null;
  detail: "Normal Goal" | "Penalty" | "Own Goal";
}

/** Parse UNE entrée type "Mbappé 45+2' (p)" — défensif, ne jette jamais */
export function parseScorerEntry(entry: string): ParsedScorer | null {
  let s = entry.trim();
  if (!s || s.toLowerCase() === "null") return null;

  // Suffixes (OG) / (p) / (P), où qu'ils soient dans l'entrée
  let detail: ParsedScorer["detail"] = "Normal Goal";
  if (/\(\s*OG\s*\)/i.test(s)) detail = "Own Goal";
  else if (/\(\s*p\s*\)/i.test(s)) detail = "Penalty";
  s = s.replace(/\(\s*(?:OG|p)\s*\)/gi, " ").trim();

  // Minute (avec temps additionnel éventuel), en fin d'entrée
  // Formats réels observés : "45'", "45+5'", "45'+5'" (apostrophe des deux côtés)
  const m = s.match(/^(.*?)[\s,]*(\d{1,3})\s*[''′]?\s*(?:\+\s*(\d{1,3}))?\s*[''′]?\s*$/);
  if (!m) {
    // Pas de minute lisible : on garde quand même le nom (minute 0)
    return { player: s.replace(/['’′]/g, "").trim() || "?", minute: 0, extra: null, detail };
  }
  const player = m[1].trim().replace(/[,;]+$/, "").trim();
  return {
    player: player || "?",
    minute: parseInt(m[2], 10),
    extra: m[3] ? parseInt(m[3], 10) : null,
    detail,
  };
}

/** Parse le champ complet home_scorers/away_scorers → événements triés */
export function parseScorers(raw: unknown, teamId: number): GoalEvent[] {
  if (raw == null) return [];
  // Certains dumps pourraient déjà fournir un tableau : on gère aussi
  const entries: string[] = [];
  if (Array.isArray(raw)) {
    for (const e of raw) if (typeof e === "string") entries.push(e);
  } else if (typeof raw === "string") {
    let s = normalizeQuotes(raw).trim();
    if (!s || s.toLowerCase() === "null" || s === "{}" || s === '""') return [];
    // Retire les accolades extérieures
    s = s.replace(/^\{/, "").replace(/\}$/, "").trim();
    if (!s || s.toLowerCase() === "null") return [];
    // Entrées entre guillemets si présentes, sinon découpage par virgule
    const quoted = [...s.matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    if (quoted.length > 0) entries.push(...quoted);
    else entries.push(...s.split(","));
  } else {
    return [];
  }

  const events: GoalEvent[] = [];
  for (const e of entries) {
    const p = parseScorerEntry(e);
    if (p) {
      events.push({
        minute: p.minute,
        extra: p.extra,
        type: "goal",
        detail: p.detail,
        teamId,
        player: p.player,
        assist: null,
      });
    }
  }
  // Tri : minute de base, puis temps additionnel (45 < 45+5 < 46)
  events.sort((a, b) => a.minute - b.minute || (a.extra ?? 0) - (b.extra ?? 0));
  return events;
}

/* ------------------------------------------------------------------ */
/* Dates : local_date au format AMÉRICAIN "MM/DD/YYYY HH:mm"           */
/* (le mois est en premier). persian_date est ignoré.                  */
/* Sortie sans fuseau : "YYYY-MM-DDTHH:mm" (heure locale du stade).    */
/* ------------------------------------------------------------------ */

export function parseLocalDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[\sT]+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, mm, dd, yyyy, hh, min] = m;
  const p = (x: string) => x.padStart(2, "0");
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${yyyy}-${p(mm)}-${p(dd)}T${p(hh)}:${min}`;
}

/* ------------------------------------------------------------------ */
/* Statut : `finished` / `time_elapsed`, INSENSIBLE À LA CASSE.        */
/* Tout ce qui n'est ni "finished" ni "notstarted" = match en cours.   */
/* ------------------------------------------------------------------ */

export function parseStatus(finished: unknown, timeElapsed: unknown): {
  status: "FT" | "NS" | "LIVE";
  elapsed: number | null;
} {
  // Données réelles : time_elapsed porte le STATUT TEXTE ("finished",
  // "notstarted", "Finished"...) et finished vaut "TRUE"/"FALSE".
  const te = String(timeElapsed ?? "").toLowerCase().replace(/[\s_-]/g, "");
  const fin = typeof finished === "boolean"
    ? (finished ? "true" : "false")
    : String(finished ?? "").toLowerCase().replace(/[\s_-]/g, "");

  if (te.includes("finished") || fin === "true" || fin === "finished" || fin === "ft") {
    return { status: "FT", elapsed: null };
  }
  if (te.includes("notstarted")) return { status: "NS", elapsed: null };
  if (te !== "" && te !== "null") {
    // Ni finished ni notstarted → match en cours (défensif : format live inconnu)
    return { status: "LIVE", elapsed: parseElapsed(timeElapsed) };
  }
  if (fin === "false" || fin === "notstarted" || fin === "ns" || fin === "" || fin === "null") {
    return { status: "NS", elapsed: null };
  }
  return { status: "LIVE", elapsed: parseElapsed(timeElapsed) };
}

function parseElapsed(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const m = raw.match(/(\d{1,3})/);
    if (m) {
      const n = parseInt(m[1], 10);
      return n > 0 ? n : null;
    }
  }
  return null;
}

/** Nombre tolérant : "2" → 2, "" / null / "null" → null */
export function parseNum(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t || t.toLowerCase() === "null") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
