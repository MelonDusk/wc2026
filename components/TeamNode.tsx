"use client";

import { SlimTeam } from "@/lib/types";
import { initials } from "@/lib/format";
import { flagUrl } from "@/lib/flags";

interface TeamNodeProps {
  x: number;
  y: number;
  r: number;
  team: SlimTeam | null;
  /** ex. "Winner Match 74" quand l'équipe n'est pas encore connue */
  label: string | null;
  eliminated: boolean;
  live: boolean;
  clipId: string;
  onSelect?: (team: SlimTeam) => void;
}

/**
 * Vignette circulaire d'équipe.
 * - Équipe connue : drapeau rond plein bord (cover), bordure fine sombre.
 * - Équipe inconnue (team_id "0") : point neutre + label gris ("Winner Match 74").
 * - Éliminée : filtre grayscale. En train de jouer : point rouge LIVE.
 */
export default function TeamNode({
  x,
  y,
  r,
  team,
  label,
  eliminated,
  live,
  clipId,
  onSelect,
}: TeamNodeProps) {
  if (!team) {
    return (
      <g>
        <circle
          cx={x}
          cy={y}
          r={r * 0.4}
          fill="#222222"
          stroke="#3a3a3a"
          strokeWidth={1.5}
        />
        {label && (
          <text
            x={x}
            y={y + r * 0.4 + 11}
            textAnchor="middle"
            fontSize={8.5}
            fill="#6f6f6f"
          >
            {label}
          </text>
        )}
      </g>
    );
  }

  const url = flagUrl(team);
  const handleActivate = () => onSelect?.(team);

  return (
    <a
      role="button"
      tabIndex={0}
      aria-label={`Voir les matchs de ${team.name}`}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <g filter={eliminated ? "url(#grayscale)" : undefined}>
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
        {url && (
          /* Cover plein bord : l'image remplit tout le cercle, rognée au clip */
          <image
            href={url}
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
