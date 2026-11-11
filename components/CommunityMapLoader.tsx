"use client";

import dynamic from "next/dynamic";

/** Same reason as the other map loaders: Mapbox GL touches window on import. */
const CommunityMap = dynamic(() => import("./CommunityMap"), {
  ssr: false,
  loading: () => (
    <div
      className="fixed inset-0 flex items-center justify-center text-[13px]"
      style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
    >
      Reading the group…
    </div>
  ),
});

export default function CommunityMapLoader() {
  return <CommunityMap />;
}
