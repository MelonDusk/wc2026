"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import skeletonJson from "@/data/bracket-skeleton.json";
import {
  BracketSkeleton,
  resolveBracket,
  computeTeamStates,
} from "@/lib/bracket";
import { FixturesPayload, SlimFixture, SlimTeam, isLive } from "@/lib/types";
import BracketRadial from "@/components/BracketRadial";
import MatchDrawer from "@/components/MatchDrawer";

const POLL_MS = 90_000; // polling uniquement si au moins un match est live

export default function Home() {
  const [fixtures, setFixtures] = useState<SlimFixture[]>([]);
  const [stale, setStale] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<SlimTeam | null>(null);
  const fixturesRef = useRef<SlimFixture[]>([]);

  const fetchFixtures = useCallback(async () => {
    try {
      const res = await fetch("/api/fixtures");
      const data: FixturesPayload = await res.json();
      setFixtures(data.fixtures);
      fixturesRef.current = data.fixtures;
      setStale(data.stale);
    } catch {
      setStale(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Le bracket s'affiche immédiatement avec le squelette statique ;
  // les scores arrivent en hydratation progressive.
  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  // Polling léger : seulement si un match est en cours
  useEffect(() => {
    const timer = setInterval(() => {
      if (fixturesRef.current.some((f) => isLive(f.status))) {
        fetchFixtures();
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchFixtures]);

  const resolved = useMemo(
    () => resolveBracket(skeletonJson as BracketSkeleton, fixtures),
    [fixtures]
  );
  const states = useMemo(() => computeTeamStates(fixtures), [fixtures]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 flex flex-col min-h-screen">
      <header className="text-center mb-4">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
          Coupe du Monde <span className="text-[#d4af37]">2026</span>
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Tableau final — cliquez sur une équipe pour le détail de ses matchs
        </p>
        {stale && loaded && (
          <p
            role="status"
            className="inline-block mt-2 text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/40 rounded-full px-3 py-1"
          >
            Données en cours de rafraîchissement…
          </p>
        )}
      </header>

      <div className="flex-1">
        <BracketRadial
          matches={resolved}
          states={states}
          onTeamSelect={setSelectedTeam}
        />
      </div>

      <footer className="text-center text-xs text-neutral-500 py-6 space-x-1">
        <span>
          Design inspiré du travail d&apos;
          {/* TODO : vérifier l'URL exacte du profil d'Emilio Sansolini avant mise en ligne */}
          <a
            href="https://www.instagram.com/emiliosansolini/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-neutral-300"
          >
            Emilio Sansolini
          </a>
        </span>
        <span>·</span>
        <span>
          Données{" "}
          <a
            href="https://www.api-football.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-neutral-300"
          >
            API-Football
          </a>
        </span>
        <span>·</span>
        <span>Fait avec Claude Code</span>
      </footer>

      {selectedTeam && (
        <MatchDrawer
          team={selectedTeam}
          fixtures={fixtures}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </main>
  );
}
