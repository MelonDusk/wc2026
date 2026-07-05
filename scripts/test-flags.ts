/**
 * Vérifie que CHAQUE équipe présente dans les données a un drapeau
 * mappé ET présent dans /public/flags. Échec bruyant sinon.
 *   npm run test:flags
 * (pointe data/mock-games.json ; remplacer par un dump réel pour
 *  valider les 48 équipes officielles)
 */
import fs from "node:fs";
import path from "node:path";
import { NAME_TO_ISO } from "../lib/flags.ts";

const root = path.join(import.meta.dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "mock-games.json"), "utf-8"));

const names = new Set<string>();
for (const g of data.games ?? []) {
  for (const side of ["home", "away"]) {
    if (String(g[`${side}_team_id`]) !== "0") {
      const n = g[`${side}_team_name_en`] ?? g[`${side}_team_name`];
      if (typeof n === "string" && n.trim()) names.add(n.trim());
    }
  }
}

let failures = 0;
for (const name of [...names].sort()) {
  const iso = NAME_TO_ISO[name];
  if (!iso) {
    console.error(`✗ « ${name} » : aucune entrée dans NAME_TO_ISO (lib/flags.ts)`);
    failures++;
    continue;
  }
  const file = path.join(root, "public", "flags", `${iso}.svg`);
  if (!fs.existsSync(file)) {
    console.error(`✗ « ${name} » → ${iso} : fichier public/flags/${iso}.svg manquant`);
    failures++;
    continue;
  }
  console.log(`✓ ${name} → ${iso}.svg`);
}
console.log(`\n${names.size} équipes vérifiées, ${failures} problème(s).`);
if (failures > 0) process.exit(1);
