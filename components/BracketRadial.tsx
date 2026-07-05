"use client";

import { useMemo } from "react";
import {
  ResolvedMatch,
  TeamStates,
  polarToXY,
  teamColor,
} from "@/lib/bracket";
import { SlimTeam } from "@/lib/types";
import TeamNode from "./TeamNode";

const VB = 1000;
const CX = VB / 2;
const CY = VB / 2;
const R_MAX = 430;

/** Rayon des vignettes selon le tour (plus grand vers le centre) */
const NODE_R: Record<string, number> = {
  round_of_32: 19,
  round_of_16: 23,
  quarter_finals: 27,
  semi_finals: 31,
  final: 36,
};

interface BracketRadialProps {
  matches: ResolvedMatch[];
  states: TeamStates;
  onTeamSelect: (team: SlimTeam) => void;
}

/**
 * Bracket radial SVG. Les scores ne sont PAS affichés ici (décision
 * design) : ils vivent dans le drawer. Le bracket ne montre que les
 * équipes, les lignes de progression et l'indicateur LIVE.
 */
export default function BracketRadial({
  matches,
  states,
  onTeamSelect,
}: BracketRadialProps) {
  const byKey = useMemo(() => {
    const m = new Map<string, ResolvedMatch>();
    for (const match of matches) m.set(match.key, match);
    return m;
  }, [matches]);

  const championTeam = useMemo(() => {
    if (states.champion == null) return null;
    for (const m of matches) {
      if (m.fixture?.home?.id === states.champion) return m.fixture.home;
      if (m.fixture?.away?.id === states.champion) return m.fixture.away;
    }
    return null;
  }, [matches, states.champion]);

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Tableau final de la Coupe du Monde 2026"
      className="w-full h-auto select-none"
    >
      <defs>
        <filter id="grayscale">
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <radialGradient id="goldHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#d4af37" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ---- Connexions entre tours : coudes orthogonaux ---- */}
      {matches.map((m) => {
        if (!m.feedsInto) return null;
        const parent = byKey.get(m.feedsInto);
        if (!parent) return null;
        const from = polarToXY(m.angle, m.radius, CX, CY, R_MAX);
        const elbow = polarToXY(m.angle, parent.radius, CX, CY, R_MAX);
        const to = polarToXY(parent.angle, parent.radius, CX, CY, R_MAX);
        const winnerId = m.fixture?.winnerId ?? null;
        let stroke = "#2e2e2e";
        let width = 1.5;
        if (winnerId != null && m.fixture?.home && m.fixture?.away) {
          const winner =
            winnerId === m.fixture.home.id ? m.fixture.home : m.fixture.away;
          stroke = teamColor(winner.name);
          width = 2.5;
        }
        return (
          <path
            key={`link-${m.key}`}
            d={`M ${from.x.toFixed(1)} ${from.y.toFixed(1)} L ${elbow.x.toFixed(1)} ${elbow.y.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            strokeLinejoin="round"
            opacity={winnerId != null ? 0.9 : 0.6}
          />
        );
      })}

      {/* ---- Centre : trophée sur halo doré ---- */}
      <circle cx={CX} cy={CY} r={95} fill="url(#goldHalo)" />
      <text x={CX} y={CY + 18} textAnchor="middle" fontSize={52} aria-hidden="true">
        🏆
      </text>
      {championTeam && (
        <text
          x={CX}
          y={CY + 52}
          textAnchor="middle"
          fontSize={16}
          fontWeight={700}
          fill="#d4af37"
        >
          {championTeam.name}
        </text>
      )}

      {/* ---- Matchs : deux vignettes (pas de score sur le bracket) ---- */}
      {matches.map((m) => {
        const nodeR = NODE_R[m.roundName] ?? 20;
        const pos = polarToXY(m.angle, m.radius, CX, CY, R_MAX);
        const theta = (m.angle * Math.PI) / 180;
        const tx = Math.cos(theta);
        const ty = Math.sin(theta);
        const d = nodeR + 6;
        return (
          <g key={m.key}>
            <TeamNode
              x={pos.x - tx * d}
              y={pos.y - ty * d}
              r={nodeR}
              team={m.fixture?.home ?? null}
              label={m.fixture?.homeLabel ?? null}
              eliminated={m.fixture?.home ? states.eliminated.has(m.fixture.home.id) : false}
              live={m.fixture?.home ? states.live.has(m.fixture.home.id) : false}
              clipId={`clip-${m.key}-h`}
              onSelect={onTeamSelect}
            />
            <TeamNode
              x={pos.x + tx * d}
              y={pos.y + ty * d}
              r={nodeR}
              team={m.fixture?.away ?? null}
              label={m.fixture?.awayLabel ?? null}
              eliminated={m.fixture?.away ? states.eliminated.has(m.fixture.away.id) : false}
              live={m.fixture?.away ? states.live.has(m.fixture.away.id) : false}
              clipId={`clip-${m.key}-a`}
              onSelect={onTeamSelect}
            />
          </g>
        );
      })}
    </svg>
  );
}
