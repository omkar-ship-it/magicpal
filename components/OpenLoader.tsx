"use client";

import dynamic from "next/dynamic";

/** Same reason as CircleLoader: Mapbox GL touches window at module load. */
const CircleMap = dynamic(() => import("./CircleMap"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center text-[13px] text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
      Loading the open network…
    </div>
  ),
});

export default OpenLoader;

function OpenLoader() {
  return <CircleMap variant="open" />;
}
