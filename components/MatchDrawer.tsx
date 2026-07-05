"use client";

import { useEffect, useState } from "react";
import {
  SlimFixture,
  SlimEvent,
  SlimTeam,
  EventsPayload,
  isFinished,
  isLive,
} from "@/lib/types";
import { ROUND_LABEL_FR } from "@/lib/bracket";
import { formatStatus, formatKickoff, formatScoreWithPens, initials } from "@/lib/format";
import EventTimeline from "./EventTimeline";

interface MatchDrawerProps {
  team: SlimTeam;
  fixtures: SlimFixture[];
  onClose: () => void;
}

type EventsState = Record<number, SlimEvent[] | "loading">;

/**
 * Détail des matchs d'une équipe.
 * Desktop (≥768px) : drawer latéral droit. Mobile : bottom sheet.
 * Fermeture : clic extérieur, Échap, bouton ×.
 */
export default function MatchDrawer({ team, fixtures, onClose }: MatchDrawerProps) {
  const [events, setEvents] = useState<EventsState>({});

  const teamMatches = fixtures
    .filter((f) => f.home?.id === team.id || f.away?.id === team.id)
    .sort((a, b) => b.dateLocal.localeCompare(a.dateLocal)); // récent → ancien

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    for (const f of teamMatches) {
      if (f.status === "NS") continue;
      setEvents((prev) =>
        prev[f.id] !== undefined ? prev : { ...prev, [f.id]: "loading" }
      );
      const state = isFinished(f.status) ? "finished" : "live";
      fetch(`/api/match/${f.id}?state=${state}`)
        .then((r) => r.json())
        .then((data: EventsPayload) => {
          if (!cancelled) setEvents((prev) => ({ ...prev, [f.id]: data.events }));
        })
        .catch(() => {
          if (!cancelled) setEvents((prev) => ({ ...prev, [f.id]: [] }));
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  const sideName = (f: SlimFixture, side: "home" | "away") =>
    (side === "home" ? f.home?.name : f.away?.name) ??
    (side === "home" ? f.homeLabel : f.awayLabel) ??
    "À déterminer";

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`Matchs de ${team.name}`}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl overflow-y-auto bg-neutral-900 border-t border-neutral-700 shadow-2xl
                   md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[420px] md:rounded-none md:border-t-0 md:border-l"
      >
        {/* En-tête */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 bg-neutral-900/95 backdrop-blur border-b border-neutral-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-neutral-400">
            {initials(team.name)}
          </span>
          <h2 className="text-lg font-bold flex-1">{team.name}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="h-9 w-9 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Liste des matchs, du plus récent au plus ancien */}
        <div className="px-5 py-4 space-y-6">
          {teamMatches.length === 0 && (
            <p className="text-neutral-500 text-sm">
              Aucun match trouvé pour cette équipe dans la phase finale.
            </p>
          )}
          {teamMatches.map((f) => {
            const ev = events[f.id];
            const upcoming = f.status === "NS";
            const score = formatScoreWithPens(f);
            return (
              <section
                key={f.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4"
              >
                <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                  {ROUND_LABEL_FR[f.round] ?? f.round}
                </p>
                <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                  <span
                    className={
                      f.winnerId != null && f.winnerId === f.home?.id
                        ? "text-white"
                        : "text-neutral-400"
                    }
                  >
                    {sideName(f, "home")}
                  </span>
                  <span className="font-bold text-base text-white px-1">
                    {score ?? "vs"}
                  </span>
                  <span
                    className={
                      f.winnerId != null && f.winnerId === f.away?.id
                        ? "text-white"
                        : "text-neutral-400"
                    }
                  >
                    {sideName(f, "away")}
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 ${isLive(f.status) ? "text-red-400 font-semibold" : "text-neutral-500"}`}
                >
                  {isLive(f.status) && (
                    <span className="live-dot inline-block mr-1">🔴</span>
                  )}
                  {formatStatus(f)}
                </p>

                {upcoming ? (
                  <p className="text-sm text-neutral-300 mt-3">
                    Coup d&apos;envoi : {formatKickoff(f.dateLocal)}{" "}
                    <span className="text-neutral-500">(heure du stade)</span>
                  </p>
                ) : ev === "loading" || ev === undefined ? (
                  <div className="mt-3 space-y-2" aria-label="Chargement des événements">
                    <div className="skeleton-line h-3 w-3/4" />
                    <div className="skeleton-line h-3 w-2/3" />
                    <div className="skeleton-line h-3 w-4/5" />
                  </div>
                ) : (
                  <div className="mt-2">
                    <EventTimeline events={ev} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
