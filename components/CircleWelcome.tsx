"use client";

import { useEffect, useState } from "react";
import { continentOf, cityById, type CircleMember } from "@/lib/circleData";

const KEY = "mp_circle_welcome";

/** Set by the invite screen so the pull-back plays once, on arrival, not every visit. */
export function markJustJoined() {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Blocked storage just means no welcome — the map still works.
  }
}

/** Reads and clears the flag in one go, so a refresh doesn't replay it. */
export function takeJustJoined(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const had = window.sessionStorage.getItem(KEY) === "1";
    if (had) window.sessionStorage.removeItem(KEY);
    return had;
  } catch {
    return false;
  }
}

/**
 * The first five seconds.
 *
 * Joining used to drop you straight onto a world map with a dense card on
 * it — accurate, and completely flat. Now the map opens on your own city and
 * pulls back until the whole class is on screen, with this over the top of
 * it. The motion is the pitch: here's you, and here's everyone else you
 * graduated with. It plays once, gets out of the way on its own, and a tap
 * skips it.
 */
export default function CircleWelcome({
  name,
  communityName,
  emoji,
  members,
  cityId,
  onDone,
}: {
  name: string;
  communityName: string;
  emoji: string;
  members: CircleMember[];
  cityId: string;
  onDone: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  const cities = new Set(members.map((m) => m.cityId));
  const continents = new Set(
    [...cities].map((id) => cityById(id)).filter(Boolean).map((c) => continentOf(c!))
  );
  // You aren't in the roster, so this is already "other people in my city" —
  // subtracting yourself would undercount against every other screen.
  const here = members.filter((m) => m.cityId === cityId).length;
  const city = cityById(cityId);

  useEffect(() => {
    const hold = setTimeout(() => setLeaving(true), 2200);
    const done = setTimeout(onDone, 2750);
    return () => {
      clearTimeout(hold);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <button
      onClick={onDone}
      aria-label="Continue to the map"
      className="fixed inset-0 z-[1400] flex cursor-default flex-col items-center justify-center px-6 text-center"
      style={{
        background: "color-mix(in srgb, var(--card) 86%, transparent)",
        backdropFilter: "blur(10px)",
        animation: leaving ? "welcome-out 520ms ease-in forwards" : "welcome-in 420ms ease-out both",
      }}
    >
      <span
        className="grid h-16 w-16 place-items-center rounded-3xl text-[30px]"
        style={{ background: "var(--card)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lift)" }}
      >
        {emoji}
      </span>

      <p className="mt-4 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
        You&rsquo;re in
      </p>
      <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[30px]">Welcome, {name.split(" ")[0]}</h1>
      <p className="mt-1.5 max-w-[22rem] text-[14px] leading-5 text-[var(--ink-soft)]">
        {communityName} — {members.length} of you, in {cities.size} cities across {continents.size} continents.
        {here > 0 ? ` ${here} ${here === 1 ? "is" : "are"} in ${city?.name}.` : ""}
      </p>

      <span className="mt-6 text-[11.5px] text-[var(--ink-soft)]">Tap to skip</span>
    </button>
  );
}
