"use client";

import dynamic from "next/dynamic";
import type { CircleInvite } from "@/lib/circleData";

/**
 * Client-only, for the same reason CircleLoader is.
 *
 * This screen reads your existing profile so a second invite adds a
 * community rather than asking you to introduce yourself again — and a
 * server render has no localStorage, so doing that during SSR hydrates
 * mismatched and React throws the whole subtree away.
 */
const CircleJoin = dynamic(() => import("./CircleJoin"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen place-items-center text-[13px] text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
      Loading your invite…
    </div>
  ),
});

export default function CircleJoinLoader({ invite }: { invite: CircleInvite }) {
  return <CircleJoin invite={invite} />;
}
