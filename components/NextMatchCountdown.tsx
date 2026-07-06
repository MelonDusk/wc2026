"use client";

import { useEffect, useState } from "react";
import { SlimFixture, isLive } from "@/lib/types";
import { kickoffInstant } from "@/lib/format";

interface NextMatchCountdownProps {
  fixtures: SlimFixture[];
}

function sideName(f: SlimFixture, side: "home" | "away"): string {
  return (
    (side === "home" ? f.home?.name : f.away?.name) ??
    (side === "home" ? f.homeLabel : f.awayLabel) ??
    "TBD"
  );
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const mnt = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(mnt)}:${p(s)}`;
}

/**
 * "Next match" ticker below the header. Priority: a currently LIVE match
 * (shown with the same blinking red dot used on bracket nodes) takes over
 * from the countdown; once it's no longer live, the ticker automatically
 * falls back to the soonest upcoming "NS" fixture and restarts the countdown.
 */
export default function NextMatchCountdown({ fixtures }: NextMatchCountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now == null) return null;

  const live = fixtures.find((f) => isLive(f.status));
  if (live) {
    return (
      <p className="text-sm text-neutral-400 mt-2 text-center">
        <span className="live-dot inline-block h-2 w-2 rounded-full bg-red-500 mr-2 align-middle" />
        {sideName(live, "home")} vs {sideName(live, "away")} — Live
      </p>
    );
  }

  let next: { fixture: SlimFixture; at: number } | null = null;
  for (const f of fixtures) {
    if (f.status !== "NS") continue;
    const at = kickoffInstant(f.dateLocal);
    if (at == null || at <= now) continue;
    if (next == null || at < next.at) next = { fixture: f, at };
  }
  if (!next) return null;

  return (
    <p className="text-sm text-neutral-400 mt-2 text-center">
      Next match: {sideName(next.fixture, "home")} vs {sideName(next.fixture, "away")} in{" "}
      <span className="text-[#d4af37] font-semibold tabular-nums">
        {formatRemaining(next.at - now)}
      </span>
    </p>
  );
}
