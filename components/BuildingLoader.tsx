"use client";

import dynamic from "next/dynamic";

/**
 * Client-only, for the same reason CircleLoader is: the prototype's profile
 * lives in local storage, and rendering the page once on the server with no
 * profile and again in the browser with one is a hydration mismatch. No
 * server pass, no mismatch, and the profile can be read in a lazy
 * initialiser instead of an effect the React Compiler would reject.
 */
const BuildingPrototype = dynamic(() => import("./BuildingPrototype"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-2xl px-4 py-8 text-[13px] text-[var(--ink-soft)]">Loading the building…</div>
  ),
});

export default function BuildingLoader() {
  return <BuildingPrototype />;
}
