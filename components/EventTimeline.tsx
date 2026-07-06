"use client";

import { SlimEvent } from "@/lib/types";

function eventIcon(e: SlimEvent): string {
  if (e.detail === "Own Goal") return "⚽ (og)";
  if (e.detail === "Penalty") return "⚽ (pen)";
  return "⚽";
}

/**
 * Vertical timeline of goals, sorted by minute then added time
 * (45 < 45+5 < 46). worldcup26.ir only provides scorers —
 * no cards or substitutions.
 */
export default function EventTimeline({ events }: { events: SlimEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => a.minute - b.minute || (a.extra ?? 0) - (b.extra ?? 0)
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-neutral-500 italic py-2">
        No goals recorded.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-neutral-700 ml-3 space-y-3 py-2">
      {sorted.map((e, i) => (
        <li key={i} className="ml-4">
          <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-neutral-600" />
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-mono text-neutral-400 shrink-0 w-12">
              {e.minute}
              {e.extra ? `+${e.extra}` : ""}′
            </span>
            <span aria-hidden="true">{eventIcon(e)}</span>
            <span className="text-neutral-100">{e.player ?? "?"}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
