"use client";

import dynamic from "next/dynamic";

/** Client-only, same reason as the admin side. */
const SpaceView = dynamic(() => import("./SpaceView"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen place-items-center text-[13px] text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
      Opening…
    </div>
  ),
});

export default function SpaceViewLoader({ code }: { code: string }) {
  return <SpaceView code={code} />;
}
