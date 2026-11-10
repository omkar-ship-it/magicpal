"use client";

import dynamic from "next/dynamic";

/** Same reason as the other map loaders: Mapbox GL touches window on import. */
const EventRoom = dynamic(() => import("./EventRoom"), {
  ssr: false,
  loading: () => (
    <div
      className="fixed inset-0 flex items-center justify-center text-[13px]"
      style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
    >
      Filling the room…
    </div>
  ),
});

export default function EventRoomLoader() {
  return <EventRoom />;
}
