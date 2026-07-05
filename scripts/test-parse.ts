/**
 * Tests du parseur worldcup26.ir — sans framework :
 *   npm run test:parse
 */
import { parseScorers, parseLocalDate, parseStatus, parseScorerEntry } from "../lib/parse.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}\n    attendu ${e}\n    obtenu  ${a}`);
  }
}

console.log("parseScorers :");
check("guillemets droits échappés",
  parseScorers('{"Mbappe 12\'","Thuram 71\'"}', 1).map(e => [e.player, e.minute]),
  [["Mbappe", 12], ["Thuram", 71]]);
check("guillemets courbes",
  parseScorers("{“Rodri 45+2'”,“Pedri 67' (p)”}", 1).map(e => [e.player, e.minute, e.extra, e.detail]),
  [["Rodri", 45, 2, "Normal Goal"], ["Pedri", 67, null, "Penalty"]]);
check('"null" littéral', parseScorers('"null"', 1), []);
check("null JS", parseScorers(null, 1), []);
check("chaîne vide", parseScorers("", 1), []);
check("accolades vides", parseScorers("{}", 1), []);
check("(OG) csc",
  parseScorers('{"Hakimi 88\' (OG)"}', 1)[0].detail, "Own Goal");
check("(P) majuscule",
  parseScorers('{"Lozano 33\' (P)"}', 1)[0].detail, "Penalty");
check("temps additionnel 90+8",
  parseScorers('{"Alvarez 90+8\'"}', 1)[0], 
  { minute: 90, extra: 8, type: "goal", detail: "Normal Goal", teamId: 1, player: "Alvarez", assist: null });
check("tri : 45 < 45+5 < 46 (le temps additionnel suit la minute de base)",
  parseScorers('{"C 46\'","B 45+5\'","A 45\'"}', 1).map(e => e.player),
  ["A", "B", "C"]);
check("nom composé avec espace",
  parseScorerEntry("Van de Ven 90+2'")?.player, "Van de Ven");
check("entrée illisible : conservée sans minute",
  parseScorerEntry("???")?.minute, 0);

console.log("parseLocalDate (format US MM/DD/YYYY — mois en premier) :");
check("07/11/2026 18:00 → 11 juillet", parseLocalDate("07/11/2026 18:00"), "2026-07-11T18:00");
check("06/28/2026 (28 juin, impossible en DD/MM)", parseLocalDate("06/28/2026 15:30"), "2026-06-28T15:30");
check("mois 13 rejeté", parseLocalDate("13/01/2026 10:00"), null);
check("null rejeté", parseLocalDate(null), null);
check("persian_date jamais utilisé (garanti par l'appelant)", parseLocalDate("1405/04/18 - 20:00"), null);

console.log("parseStatus (insensible à la casse) :");
check("finished", parseStatus("finished", "90").status, "FT");
check("Finished", parseStatus("Finished", "90").status, "FT");
check("FINISHED", parseStatus("FINISHED", null).status, "FT");
check("notstarted", parseStatus("notstarted", "").status, "NS");
check("NotStarted", parseStatus("NotStarted", null).status, "NS");
check("inconnu → LIVE (défensif)", parseStatus("inplay", "63"), { status: "LIVE", elapsed: 63 });
check("booléen true", parseStatus(true, null).status, "FT");
check("elapsed \"63'\"", parseStatus("live", "63'").elapsed, 63);

console.log("cas RÉELS du dump worldcup26.ir :");
check("45'+5' (apostrophe des deux côtés)",
  parseScorerEntry("F. Balogun 45'+5'"), 
  { player: "F. Balogun", minute: 45, extra: 5, detail: "Normal Goal" });
check("90'+8'", parseScorerEntry("G. Reyna 90'+8'")?.extra, 8);
check("(OG) collé sans espace",
  parseScorerEntry("D. Bobadilla 7'(OG)"),
  { player: "D. Bobadilla", minute: 7, extra: null, detail: "Own Goal" });
check("guillemets courbes mixtes “...” et ”...”",
  parseScorers("{“J. Quiñones 9'”,”R. Jiménez 67'”}", 1).map(e => [e.player, e.minute]),
  [["J. Quiñones", 9], ["R. Jiménez", 67]]);
check("diacritiques (Krejčí)", parseScorerEntry("L. Krejčí 59'")?.player, "L. Krejčí");
check("statut réel TRUE/finished", parseStatus("TRUE", "finished").status, "FT");
check("statut réel FALSE/notstarted", parseStatus("FALSE", "notstarted").status, "NS");
check("statut réel Finished (casse mixte)", parseStatus("TRUE", "Finished").status, "FT");
check("live probable : FALSE + \"63\"", parseStatus("FALSE", "63"), { status: "LIVE", elapsed: 63 });
check("live probable : FALSE + \"HT\"", parseStatus("FALSE", "HT").status, "LIVE");

if (failures > 0) {
  console.error(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log("\nTous les tests passent.");
