"use client";

import { useState } from "react";

/**
 * Can the device work out which floor you're on? Ask it.
 *
 * This exists because "GPS can't do floors" is the kind of claim that gets
 * nodded at and then quietly disbelieved by the next person to pick the
 * feature up. So the prototype measures it instead: tap, and it reads the
 * altitude and the altitude accuracy the browser actually reports, here,
 * in this building, and puts the number next to the height of a storey.
 *
 * A floor is about 3.2m. Indoors the vertical error is usually tens of
 * metres and `altitudeAccuracy` is frequently null outright — meaning the
 * device declines to even guess. That is the whole argument, in one
 * reading, on the reviewer's own phone.
 */
const STOREY_METRES = 3.2;

type Reading =
  | { state: "idle" }
  | { state: "asking" }
  | { state: "denied"; message: string }
  | {
      state: "read";
      altitude: number | null;
      altitudeAccuracy: number | null;
      horizontalAccuracy: number;
    };

export default function FloorProbe() {
  const [r, setR] = useState<Reading>({ state: "idle" });

  function probe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setR({ state: "denied", message: "This browser has no geolocation at all." });
      return;
    }
    setR({ state: "asking" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setR({
          state: "read",
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          horizontalAccuracy: pos.coords.accuracy,
        }),
      (e) =>
        setR({
          state: "denied",
          message:
            e.code === e.PERMISSION_DENIED
              ? "Permission denied — which is itself the answer: a floor can't depend on a prompt people say no to."
              : "The device couldn't produce a position indoors.",
        }),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }
    );
  }

  const storeys =
    r.state === "read" && r.altitudeAccuracy != null
      ? Math.max(1, Math.round(r.altitudeAccuracy / STOREY_METRES))
      : null;

  return (
    <div className="card p-4">
      <p className="text-[13px] font-semibold">Why you pick your floor instead of the phone finding it</p>
      <p className="mt-1 max-w-[62ch] text-[12.5px] leading-[1.55] text-[var(--ink-soft)]">
        A storey is about {STOREY_METRES}m. Satellite positioning is worse vertically than horizontally — and
        there is no barometer API on the web at all, so the one sensor that could help isn&rsquo;t reachable from
        a browser. Rather than take that on trust, read it off this device.
      </p>

      <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={probe} disabled={r.state === "asking"}>
        {r.state === "asking" ? "Reading…" : "Measure this device"}
      </button>

      {r.state === "denied" && (
        <p className="mt-2.5 text-[12.5px] leading-[1.5]" style={{ color: "var(--warn)" }}>
          {r.message}
        </p>
      )}

      {r.state === "read" && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-xl p-3" style={{ background: "var(--sunk)" }}>
          <Row label="Altitude reported">
            {r.altitude == null ? "nothing — the device declined to guess" : `${r.altitude.toFixed(1)} m`}
          </Row>
          <Row label="Vertical accuracy">
            {r.altitudeAccuracy == null
              ? "not provided"
              : `± ${r.altitudeAccuracy.toFixed(1)} m  ·  about ${storeys} ${storeys === 1 ? "storey" : "storeys"} of uncertainty`}
          </Row>
          <Row label="Horizontal accuracy">± {r.horizontalAccuracy.toFixed(1)} m</Row>
          <p className="mt-1.5 text-[12px] leading-[1.5] text-[var(--ink-soft)]">
            {r.altitudeAccuracy == null || (storeys ?? 0) > 1
              ? "Not good enough to name a floor — which is why the floor is one tap from the person standing on it."
              : "Unusually good, and still a guess. A declared floor also carries consent, which a sensor reading never does."}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span className="font-semibold">{children}</span>
    </p>
  );
}
