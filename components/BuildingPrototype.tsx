"use client";

import { useState } from "react";
import { getMe, type CircleMe } from "@/lib/circleMe";
import BuildingStack from "./BuildingStack";
import FloorProbe from "./FloorProbe";

/**
 * Whoever is holding the phone, so the matcher has somebody to rank for.
 *
 * Read from the prototype's own local profile if there is one, otherwise a
 * stand-in — the point of the page is the floor breakdown, and making a
 * reviewer fill in a profile before they can see it would lose most of
 * them at the first screen.
 */
const VISITOR: CircleMe = {
  name: "You",
  headline: "Founder, seed stage",
  company: "—",
  cityId: "hyd",
  mode: "live",
  entityIds: [],
  beaconEventId: null,
  interests: ["fundraising", "hiring", "go-to-market", "pricing"],
  helpWith: ["product", "design"],
  lookingFor: "A senior backend engineer in Hyderabad",
};

export default function BuildingPrototype() {
  /**
   * Read once, in a lazy initialiser rather than an effect.
   *
   * The loader renders this with `ssr: false`, so the first render already
   * happens in the browser and local storage is there — which matters
   * because the React Compiler rejects setState inside an effect, and
   * because reading it on a server pass and again on the client is how you
   * get a hydration mismatch.
   */
  const [me] = useState<CircleMe>(() => ({ ...VISITOR, ...(getMe("open") ?? getMe("circle")) }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-5">
        <p className="label">Prototype · floor by floor</p>
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">
          Which lift button do I press?
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[13px] leading-[1.6] text-[var(--ink-soft)]">
          Testing one idea: that in a building, a headcount is useless and a floor is actionable. Everything below
          is dummy data — the people are the prototype&rsquo;s own members, placed deterministically, so the
          distribution is lumpy the way a real tower is.
        </p>
      </header>

      <BuildingStack me={me} />

      <div className="mt-5">
        <FloorProbe />
      </div>

      <p className="mt-5 max-w-[60ch] text-[12px] leading-[1.6] text-[var(--ink-soft)]">
        What to look for: whether the floor breakdown changes what you&rsquo;d do next compared with
        &ldquo;23 people in this building&rdquo;, whether an empty floor is reassuring or depressing, and whether
        declaring your own floor feels like a reasonable ask or one step too many.
      </p>
    </main>
  );
}
