"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import skeletonJson from "@/data/bracket-skeleton.json";
import {
  BracketSkeleton,
  resolveBracket,
  computeTeamStates,
} from "@/lib/bracket";
import { FixturesPayload, SlimFixture, SlimTeam, isLive } from "@/lib/types";
import { kickoffInstant } from "@/lib/format";
import BracketRadial from "@/components/BracketRadial";
import MatchDrawer from "@/components/MatchDrawer";
import NextMatchCountdown from "@/components/NextMatchCountdown";

const POLL_MS = 90_000; // only polls while at least one match is live

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

  // The bracket renders immediately from the static skeleton;
  // scores arrive via progressive hydration.
  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  // Light polling: while a match is in progress, or overdue to start (kickoff
  // time passed but our last snapshot still says "NS" — without this, a
  // match's very first live tick would never be picked up).
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const shouldPoll = fixturesRef.current.some((f) => {
        if (isLive(f.status)) return true;
        if (f.status !== "NS") return false;
        const at = kickoffInstant(f.dateLocal);
        return at != null && at <= now;
      });
      if (shouldPoll) fetchFixtures();
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
          World Cup <span className="text-[#d4af37]">2026</span>
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Final bracket — click a team for its match details
        </p>
        {stale && loaded && (
          <p
            role="status"
            className="inline-block mt-2 text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/40 rounded-full px-3 py-1"
          >
            Refreshing data…
          </p>
        )}
      </header>

      <NextMatchCountdown fixtures={fixtures} />

      <div className="flex-1">
        <BracketRadial
          matches={resolved}
          states={states}
          onTeamSelect={setSelectedTeam}
        />
      </div>

      <footer className="text-center py-6">
        <p className="text-sm text-neutral-400">
          Design inspired by{" "}
          <a
            href="https://www.instagram.com/emiliosansolini/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-neutral-200"
          >
            Emilio Sansolini
          </a>
        </p>
        <p className="text-[11px] text-neutral-600 opacity-70 mt-1">
          Data via{" "}
          <a
            href="https://github.com/rezarahiminia/worldcup2026"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-neutral-400"
          >
            rezarahiminia/worldcup2026
          </a>
        </p>
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
