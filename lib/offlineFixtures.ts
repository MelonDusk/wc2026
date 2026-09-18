/**
 * Snapshot figé des fixtures (backup si API worldcup26.ir tombe).
 * À mettre à jour manuellement quand vous voulez archiver l'état actuel.
 * Généré : $(date)
 */
import type { SlimFixture } from "./types";

export const OFFLINE_FIXTURES: SlimFixture[] = [
  // Ce tableau sera rempli automatiquement avec les vraies données
];

export function useOfflineMode(): boolean {
  return process.env.USE_OFFLINE === "1";
}
