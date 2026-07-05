/**
 * Drapeaux : SVG circulaires "circle-flags" (HatScripts, licence MIT),
 * hébergés EN LOCAL dans /public/flags — zéro dépendance externe.
 *
 * Mapping ÉCRIT À LA MAIN : jamais de déduction automatique nom → ISO
 * à l'exécution. Table volontairement plus large que les 48 qualifiés
 * (l'API peut varier sur l'orthographe : les deux variantes sont listées).
 * Complétude vérifiée par `npm run test:flags`, qui échoue bruyamment
 * si une équipe des données n'a pas de drapeau — pas d'échec silencieux.
 */
import type { SlimTeam } from "./types";

export const NAME_TO_ISO: Record<string, string> = {
  // Hôtes
  USA: "us", "United States": "us", Mexico: "mx", Canada: "ca",
  // Europe
  France: "fr", England: "gb-eng", Scotland: "gb-sct", Wales: "gb-wls",
  Spain: "es", Portugal: "pt", Germany: "de", Netherlands: "nl",
  Belgium: "be", Croatia: "hr", Italy: "it", Switzerland: "ch",
  Austria: "at", Denmark: "dk", Norway: "no", Sweden: "se", Poland: "pl",
  Czechia: "cz", "Czech Republic": "cz", Ukraine: "ua", Serbia: "rs",
  Hungary: "hu", Slovenia: "si", Slovakia: "sk", Romania: "ro",
  Greece: "gr", Ireland: "ie", "Republic of Ireland": "ie", Iceland: "is",
  Finland: "fi", Albania: "al", "North Macedonia": "mk",
  "Bosnia and Herzegovina": "ba",
  // Cas piégeux confirmés dans les données
  Turkey: "tr", "Türkiye": "tr",
  "Democratic Republic of the Congo": "cd", "DR Congo": "cd", // ≠ cg (Congo-Brazzaville)
  "Curaçao": "cw", Curacao: "cw",
  "Cape Verde": "cv", "Cabo Verde": "cv",
  // Amérique du Sud
  Brazil: "br", Argentina: "ar", Uruguay: "uy", Colombia: "co",
  Ecuador: "ec", Paraguay: "py", Chile: "cl", Peru: "pe",
  Venezuela: "ve", Bolivia: "bo",
  // Afrique
  Morocco: "ma", Senegal: "sn", Tunisia: "tn", Algeria: "dz", Egypt: "eg",
  Nigeria: "ng", Ghana: "gh", Cameroon: "cm",
  "Ivory Coast": "ci", "Côte d'Ivoire": "ci",
  "South Africa": "za", Mali: "ml", "Burkina Faso": "bf", Gabon: "ga",
  // Asie / Océanie
  Japan: "jp", "South Korea": "kr", "Korea Republic": "kr", Iran: "ir",
  "Saudi Arabia": "sa", Qatar: "qa", Iraq: "iq",
  "United Arab Emirates": "ae", UAE: "ae", Uzbekistan: "uz", Jordan: "jo",
  Australia: "au", Indonesia: "id", Bahrain: "bh", Oman: "om",
  "New Zealand": "nz", "New Caledonia": "nc",
  // CONCACAF
  Panama: "pa", "Costa Rica": "cr", Jamaica: "jm", Honduras: "hn",
  Haiti: "ht", "El Salvador": "sv", Guatemala: "gt",
  "Trinidad and Tobago": "tt", Suriname: "sr",
};

const warned = new Set<string>();

export function flagUrl(team: SlimTeam): string | null {
  const iso = NAME_TO_ISO[team.name.trim()];
  if (!iso) {
    // Échec VISIBLE : initiales à l'écran + warning console en dev
    if (process.env.NODE_ENV !== "production" && !warned.has(team.name)) {
      warned.add(team.name);
      console.warn(`[flags] Pas de drapeau mappé pour « ${team.name} » — ajouter l'entrée dans lib/flags.ts`);
    }
    return null;
  }
  return `/flags/${iso}.svg`;
}
