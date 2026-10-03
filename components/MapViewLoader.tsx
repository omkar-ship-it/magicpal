"use client";

import dynamic from "next/dynamic";

/**
 * Leaflet touches `window` at module load, which throws during SSR — this
 * boundary is what keeps that import off the server render entirely.
 */
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="card flex h-[480px] items-center justify-center text-[13px] text-[var(--ink-soft)]">Loading map…</div>,
});

export default MapView;
