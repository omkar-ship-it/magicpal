"use client";

import dynamic from "next/dynamic";

/**
 * Mapbox GL touches `window`/WebGL at module load, which throws during
 * SSR — this boundary is what keeps that import off the server render
 * entirely.
 */
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center text-[13px] text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
      Loading map…
    </div>
  ),
});

export default MapView;
