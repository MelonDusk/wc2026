"use client";

import { SlimTeam } from "@/lib/types";
import { initials } from "@/lib/format";
import { flagUrl } from "@/lib/flags";

interface TeamNodeProps {
  x: number;
  y: number;
  r: number;
  team: SlimTeam | null;
  eliminated: boolean;
  live: boolean;
  clipId: string;
  onSelect?: (team: SlimTeam) => void;
}

/**
 * Vignette circulaire d'équipe.
 * - Équipe connue : drapeau rond plein bord (cover), bordure fine sombre.
 * - Équipe inconnue (team_id "0") : simple point neutre, pas de texte —
 *   le détail ("Winner Match X") vit dans le drawer, pas sur le bracket.
 * - En couleur par défaut (pas encore jouée, ou qualifiée et toujours en
 *   lice). Éliminée (a perdu un match déjà joué) : noir et blanc, sauf au
 *   survol desktop qui révèle la couleur (cf. globals.css).
 * - En train de jouer : point rouge LIVE (hors filtre grayscale).
 */
export default function TeamNode({
  x,
  y,
  r,
  team,
  eliminated,
  live,
  clipId,
  onSelect,
}: TeamNodeProps) {
  if (!team) {
    return (
      <circle
        cx={x}
        cy={y}
        r={r * 0.4}
        fill="#222222"
        stroke="#3a3a3a"
        strokeWidth={1.5}
      />
    );
  }

  const url = flagUrl(team);
  const handleActivate = () => onSelect?.(team);

  return (
    <a
      role="button"
      tabIndex={0}
      aria-label={`View matches for ${team.name}`}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <g className={eliminated ? "team-node--eliminated" : undefined}>
        <defs>
          <clipPath id={clipId}>
            <circle cx={x} cy={y} r={r} />
          </clipPath>
        </defs>
        <circle cx={x} cy={y} r={r} fill="#1c1c1c" />
        {/* Initiales : repli si pas de drapeau (source non tranchée) ou image cassée */}
        <text
          x={x}
          y={y + r * 0.22}
          textAnchor="middle"
          fontSize={r * 0.6}
          fontWeight={700}
          fill="#9a9a9a"
        >
          {initials(team.name)}
        </text>
        {/* xlinkHref en plus de href : Safari iOS ignore silencieusement l'attribut
            href seul sur un <image> SVG dans certains contextes (bug WebKit connu),
            l'image ne charge jamais et les initiales du dessous restent visibles. */}
        {url && (
          // Cover plein bord : l'image remplit tout le cercle, rognée au clip
          <image
            href={url}
            xlinkHref={url}
            x={x - r}
            y={y - r}
            width={r * 2}
            height={r * 2}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
        )}
        {/* Bordure fine sombre — plus de bordure blanche épaisse */}
        <circle
          cx={x}
          cy={y}
          r={r}
          fill="none"
          stroke={eliminated ? "#333333" : "#3f3f3f"}
          strokeWidth={1}
        />
      </g>
      {live && (
        <circle
          className="live-dot"
          cx={x + r * 0.72}
          cy={y - r * 0.72}
          r={Math.max(3.5, r * 0.18)}
          fill="#ff2d2d"
          stroke="#0d0d0d"
          strokeWidth={1.5}
        />
      )}
    </a>
  );
}
