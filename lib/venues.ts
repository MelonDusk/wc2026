/**
 * Stade → fuseau IANA. Écrit à la main à partir de worldcup26.ir/get/stadiums
 * (les 16 sites officiels de la Coupe du Monde 2026) — l'API des MATCHS,
 * elle, ne fournit qu'un stadium_id numérique brut, jamais de ville ni de
 * fuseau. Sans cette table, impossible de calculer l'instant RÉEL d'un coup
 * d'envoi : local_date est l'heure locale du stade sans aucune indication
 * de décalage, donc "21:00" ne veut rien dire seul.
 */
export const STADIUM_TIMEZONE: Record<string, string> = {
  "1": "America/Mexico_City", // Estadio Azteca, Mexico City
  "2": "America/Mexico_City", // Estadio Akron, Guadalajara
  "3": "America/Mexico_City", // Estadio BBVA, Monterrey
  "4": "America/Chicago", // AT&T Stadium, Dallas
  "5": "America/Chicago", // NRG Stadium, Houston
  "6": "America/Chicago", // GEHA Field at Arrowhead Stadium, Kansas City
  "7": "America/New_York", // Mercedes-Benz Stadium, Atlanta
  "8": "America/New_York", // Hard Rock Stadium, Miami
  "9": "America/New_York", // Gillette Stadium, Boston
  "10": "America/New_York", // Lincoln Financial Field, Philadelphia
  "11": "America/New_York", // MetLife Stadium, New York/New Jersey
  "12": "America/Toronto", // BMO Field, Toronto
  "13": "America/Vancouver", // BC Place, Vancouver
  "14": "America/Los_Angeles", // Lumen Field, Seattle
  "15": "America/Los_Angeles", // Levi's Stadium, San Francisco Bay Area
  "16": "America/Los_Angeles", // SoFi Stadium, Los Angeles
};
