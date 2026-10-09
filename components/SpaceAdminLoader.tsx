"use client";

import dynamic from "next/dynamic";

/** Client-only: spaces live in localStorage, which a server render hasn't got. */
const SpaceAdmin = dynamic(() => import("./SpaceAdmin"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen place-items-center text-[13px] text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
      Loading your spaces…
    </div>
  ),
});

export default function SpaceAdminLoader() {
  return <SpaceAdmin />;
}
