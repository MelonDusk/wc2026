"use client";

import { useMemo } from "react";
import { ResolvedMatch, TeamStates, polarToXY } from "@/lib/bracket";
import { SlimTeam } from "@/lib/types";
import TeamNode from "./TeamNode";

const VB = 1000;
const CX = VB / 2;
const CY = VB / 2;
const R_MAX = 390;
/** Rayon du petit nœud gris qui matérialise chaque match (le "hub" où les lignes se rejoignent) */
const HUB_R = 5;
/** Diamètre (unités viewBox) du slot central réservé au PNG custom trophée+glow */
const GLOW_SIZE = 480;

/** Rayon des vignettes selon le tour (plus grand vers le centre) — -20% puis +5% */
const NODE_R: Record<string, number> = {
  round_of_16: 21,
  quarter_finals: 24,
  semi_finals: 27,
  final: 32,
};

interface BracketRadialProps {
  matches: ResolvedMatch[];
  states: TeamStates;
  onTeamSelect: (team: SlimTeam) => void;
}

/** Arc de cercle à rayon constant entre deux angles (équipe → nœud du match). */
function sameRadiusArc(angleFrom: number, angleTo: number, radius: number): string {
  const p0 = polarToXY(angleFrom, radius, CX, CY, R_MAX);
  const p1 = polarToXY(angleTo, radius, CX, CY, R_MAX);
  const rPx = radius * R_MAX;
  const sweep = angleTo > angleFrom ? 1 : 0;
  return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A ${rPx.toFixed(1)} ${rPx.toFixed(1)} 0 0 ${sweep} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
}

/** Différence angulaire signée dans (-180, 180], pour choisir le bon sens de rotation de l'arc. */
function angleDelta(fromDeg: number, toDeg: number): number {
  let d = (toDeg - fromDeg) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * Lien entre le nœud d'un match et le nœud de son match parent : segment
 * radial pur (même angle, du rayon de l'enfant à celui du parent), puis un
 * VRAI arc de cercle SVG (commande A, rayon constant = rayon du parent) qui
 * balaie jusqu'à l'angle du parent. Aucune courbe approximée — l'arc est
 * mathématiquement posé sur l'anneau du parent, comme les cercles eux-mêmes.
 */
function hubLink(from: ResolvedMatch, to: ResolvedMatch): string {
  const p0 = polarToXY(from.angle, from.radius, CX, CY, R_MAX);
  const elbow = polarToXY(from.angle, to.radius, CX, CY, R_MAX);
  const p1 = polarToXY(to.angle, to.radius, CX, CY, R_MAX);
  const rPx = to.radius * R_MAX;
  const sweep = angleDelta(from.angle, to.angle) > 0 ? 1 : 0;
  return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L ${elbow.x.toFixed(1)} ${elbow.y.toFixed(1)} A ${rPx.toFixed(1)} ${rPx.toFixed(1)} 0 0 ${sweep} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
}

/**
 * Bracket radial SVG. Les scores ne sont PAS affichés ici (décision
 * design) : ils vivent dans le drawer. Le bracket ne montre que les
 * équipes, les lignes de progression et l'indicateur LIVE.
 *
 * Architecture des connexions : équipe → nœud gris du match → nœud gris du
 * match parent. Chaque équipe est positionnée par un décalage ANGULAIRE
 * (pas cartésien) autour de l'angle propre du match, au même rayon que son
 * nœud — ce qui permet de relier équipe → nœud par un arc de cercle exact
 * (rayon constant), et nœud → nœud parent par une courbe radiale (rayons
 * différents). Aucune ligne ne va directement d'une pastille à une autre.
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

  const layout = useMemo(() => {
    return matches.map((m) => {
      const nodeR = NODE_R[m.roundName] ?? 20;
      const deltaDeg = ((nodeR + 6) / (m.radius * R_MAX)) * (180 / Math.PI);
      const homeAngle = m.angle - deltaDeg;
      const awayAngle = m.angle + deltaDeg;
      const homePos = polarToXY(homeAngle, m.radius, CX, CY, R_MAX);
      const awayPos = polarToXY(awayAngle, m.radius, CX, CY, R_MAX);
      const hub = polarToXY(m.angle, m.radius, CX, CY, R_MAX);
      return { m, nodeR, homeAngle, awayAngle, homePos, awayPos, hub };
    });
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
      aria-label="World Cup 2026 final bracket"
      className="w-full h-auto select-none"
    >
      <defs>
        {/* Dégradé partagé par TOUTES les lignes de connexion : un seul
            radialGradient en coordonnées absolues (userSpaceOnUse), centré
            sur le trophée, rayon = périphérie du bracket. L'or irradie du
            centre vers les bords à travers tout le tableau — jamais de
            dégradé par ligne. Décroissance en LUMINOSITÉ (pas en opacité) :
            reste opaque et lisible même au bord le plus externe. */}
        <radialGradient
          id="lineGold"
          gradientUnits="userSpaceOnUse"
          cx={CX}
          cy={CY}
          r={R_MAX}
        >
          <stop offset="0%" stopColor="#ffe58a" />
          <stop offset="35%" stopColor="#e0ab44" />
          <stop offset="70%" stopColor="#b3812c" />
          <stop offset="100%" stopColor="#7c5c22" />
        </radialGradient>
      </defs>

      {/* ---- Connexions : équipe → nœud du match → nœud du match parent ----
          La finale n'a pas de nœud/lignes propres : son emplacement est
          entièrement couvert par le PNG trophée+glow (pas de "barre" qui
          viendrait couper le visuel central), le nom du vainqueur suffit. */}
      {layout.map(({ m, homeAngle, awayAngle }) => {
        if (m.roundName === "final") return null;
        const parent = m.feedsInto ? byKey.get(m.feedsInto) : null;
        const parentIsFinal = parent?.roundName === "final";
        return (
          <g key={`links-${m.key}`}>
            <path
              d={sameRadiusArc(homeAngle, m.angle, m.radius)}
              fill="none"
              stroke="url(#lineGold)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <path
              d={sameRadiusArc(awayAngle, m.angle, m.radius)}
              fill="none"
              stroke="url(#lineGold)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            {parent && !parentIsFinal && (
              <path
                d={hubLink(m, parent)}
                fill="none"
                stroke="url(#lineGold)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}

      {/* ---- Nœuds gris de match : le point où les lignes se rejoignent ---- */}
      {layout.map(({ m, hub }) =>
        m.roundName === "final" ? null : (
          <circle
            key={`hub-${m.key}`}
            cx={hub.x}
            cy={hub.y}
            r={HUB_R}
            fill="#3a3a3a"
            stroke="#0d0d0d"
            strokeWidth={1}
          />
        )
      )}

      {/* ---- Centre : conteneur transparent pour le PNG custom (glow + trophée).
          Voir la réponse pour la résolution/format recommandés — il suffit de
          déposer le fichier dans public/trophy-glow.png pour qu'il s'affiche. ---- */}
      <image
        href="/trophy-glow.png"
        x={CX - GLOW_SIZE / 2}
        y={CY - GLOW_SIZE / 2}
        width={GLOW_SIZE}
        height={GLOW_SIZE}
        aria-hidden="true"
      />
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

      {/* ---- Matchs : deux vignettes (pas de score sur le bracket) ----
          La finale est exclue : ses deux pastilles tomberaient en plein sur
          le PNG trophée+glow (voir plus haut). */}
      {layout.map(({ m, nodeR, homePos, awayPos }) => {
        if (m.roundName === "final") return null;
        return (
        <g key={m.key}>
          <TeamNode
            x={homePos.x}
            y={homePos.y}
            r={nodeR}
            team={m.fixture?.home ?? null}
            eliminated={m.fixture?.home ? states.eliminated.has(m.fixture.home.id) : false}
            live={m.fixture?.home ? states.live.has(m.fixture.home.id) : false}
            clipId={`clip-${m.key}-h`}
            onSelect={onTeamSelect}
          />
          <TeamNode
            x={awayPos.x}
            y={awayPos.y}
            r={nodeR}
            team={m.fixture?.away ?? null}
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
