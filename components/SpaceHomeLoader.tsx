"use client";

import dynamic from "next/dynamic";

/** Same reason as CircleLoader: the space reads its state from localStorage. */
const SpaceHome = dynamic(() => import("./SpaceHome"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center text-[13px] text-[var(--ink-soft)]">
      Opening 2gethr…
    </div>
  ),
});

export default function SpaceHomeLoader() {
  return <SpaceHome />;
}
