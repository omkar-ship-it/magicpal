"use client";

import { useMemo, useState } from "react";
import type { CircleMember } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import { LENSES, bandsFor, seatCrowd, type Lens } from "@/lib/crowd";
import Avatar from "./Avatar";

/**
 * A crowd, re-arranged around you.
 *
 * The obvious answer to four hundred overlapping pins is a list, and it is
 * the wrong one for a specific reason: a list destroys the room. You stop
 * standing in a crowd and start reading a spreadsheet, and the feeling of
 * the crowd is most of why anybody opened the map.
 *
 * So every face stays on screen and *distance changes meaning*. You are in
 * the middle; the people who answer what you came in for are large and
 * near; the rest of the room recedes outward, smaller and quieter, still
 * entirely there and one search away. The reading is the same as the map —
 * near means matters — so there is no second visual language to learn.
 *
 * Two rules this must not break. The ground stops looking like a street
 * map the moment it opens, because these positions are not geography and
 * pretending otherwise is a lie. And no lens ever drops anybody: the last
 * band is always the rest of the room.
 */
export default function CrowdView({
  crowd,
  me,
  origin,
  onOpenMember,
  onClose,
}: {
  crowd: CircleMember[];
  me: CircleMe | null;
  /** Where each face starts, in screen pixels — their pin on the map. */
  origin: Map<string, { x: number; y: number }>;
  onOpenMember: (id: string) => void;
  onClose: () => void;
}) {
  const [lens, setLens] = useState<Lens>("worth");
  const [q, setQ] = useState("");
  const [band, setBand] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>(() =>
    typeof window === "undefined" ? { w: 1200, h: 800 } : { w: window.innerWidth, h: window.innerHeight }
  );

  const { bands, why } = useMemo(() => bandsFor(lens, me, crowd), [lens, me, crowd]);
  const seats = useMemo(() => seatCrowd(bands, size.w, size.h), [bands, size]);
  const lead = bands.find((b) => b.lead);
  const leadBand = lead?.id ?? null;
  /**
   * Names are drawn on the headline band only while it is small enough to
   * read. Six names is a set; the "what's being asked" lens can put fifty
   * people in that band, and fifty labels is a smear across the rings with
   * less information in it than none. The ring colour and the legend carry
   * the meaning at that size.
   */
  const labelLead = (lead?.members.length ?? 0) <= 8;

  const needle = q.trim().toLowerCase();
  const matches = (m: CircleMember) =>
    !needle ||
    [m.name, m.headline, m.company, m.lookingFor ?? "", ...m.helpWith]
      .join(" ")
      .toLowerCase()
      .includes(needle);

  const found = needle ? crowd.filter(matches).length : 0;

  return (
    <div
      className="fixed inset-0 z-[1400]"
      // Opaque, not a scrim: the street map underneath has to go, because
      // nothing on this screen is where it says it is any more.
      style={{ background: "var(--bg)" }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      ref={(el) => {
        if (!el) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (w !== size.w || h !== size.h) setSize({ w, h });
      }}
    >
      {/* The field. Every person in the crowd, none of them dropped. */}
      <div className="absolute inset-0">
        {seats.map((seat) => {
          const from = origin.get(seat.member.id);
          const dim = needle !== "" ? !matches(seat.member) : band != null && seat.band !== band;
          return (
            <button
              key={seat.member.id}
              type="button"
              onClick={() => onOpenMember(seat.member.id)}
              className="crowd-seat absolute"
              title={`${seat.member.name} — ${seat.member.headline}`}
              style={
                {
                  left: seat.x,
                  top: seat.y,
                  width: seat.size,
                  height: seat.size,
                  marginLeft: -seat.size / 2,
                  marginTop: -seat.size / 2,
                  opacity: dim ? 0.18 : 1,
                  zIndex: seat.size > 40 ? 3 : 1,
                  // The flight: each face starts at its own pin and lands on
                  // its seat. One animation that teaches the whole idea —
                  // same people, rearranged around you.
                  "--fx": `${(from?.x ?? size.w / 2) - seat.x}px`,
                  "--fy": `${(from?.y ?? size.h / 2) - seat.y}px`,
                } as React.CSSProperties
              }
            >
              <span
                className="relative block rounded-full"
                style={
                  seat.band === leadBand
                    ? { boxShadow: "0 0 0 3px var(--brand)", borderRadius: 999 }
                    : undefined
                }
              >
                <Avatar name={seat.member.name} size={seat.size} ring={seat.size > 40 ? 3 : 2} local />
              </span>

              {/* Only the headline band is labelled. Six names is a set you
                  can read; four hundred is a smear. */}
              {seat.band === leadBand && labelLead && (
                <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-semibold">
                  {seat.member.name.split(" ")[0]}
                </span>
              )}

              {/* Everybody gets a card on hover — the outer rings are the
                  people this view must not make harder to find. */}
              <span
                className={`crowd-card pointer-events-none absolute left-1/2 z-30 w-[220px] -translate-x-1/2 rounded-xl border p-2.5 text-left ${
                  // Flipped above for the lower half of the field, where a
                  // card hung underneath runs off the bottom of the screen.
                  seat.y > size.h * 0.62 ? "bottom-full mb-2" : "top-full mt-2"
                }`}
                style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "var(--shadow-lift)" }}
              >
                <span className="block truncate text-[12px] font-semibold">{seat.member.name}</span>
                <span className="block truncate text-[11px] text-[var(--ink-soft)]">
                  {seat.member.headline} · {seat.member.company}
                </span>
                {why.get(seat.member.id) && (
                  <span className="mt-1 block text-[11px] leading-[1.4]" style={{ color: "var(--brand)" }}>
                    {why.get(seat.member.id)}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* You, at the centre, because every distance here is measured from you. */}
        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: size.w / 2, top: size.h / 2, zIndex: 5 }}
        >
          <span className="relative block">
            <Avatar name={me?.name ?? "You"} size={54} ring={4} local />
            <span
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white"
              style={{ background: "var(--brand)" }}
            >
              You
            </span>
          </span>
        </span>
      </div>

      {/* ------------------------------------------------- the controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3">
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border p-3"
          style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "var(--shadow-lift)" }}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-tight">{crowd.length} people here</p>
              <p className="text-[11.5px] leading-tight text-[var(--ink-soft)]">
                {LENSES.find((l) => l.id === lens)?.blurb}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-none rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
            >
              Back to map
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {LENSES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLens(l.id);
                  setBand(null);
                }}
                className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                style={
                  lens === l.id
                    ? { background: "var(--brand)", color: "#fff" }
                    : { background: "var(--sunk)", color: "var(--ink-soft)" }
                }
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Discovering anybody must stay one field away. The lenses
              organise the crowd; they are not allowed to bury it. */}
          <input
            className="input mt-2 py-1.5 text-[12.5px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search all ${crowd.length} — name, company, what they're after…`}
            aria-label="Search everyone here"
          />
          {needle !== "" && (
            <p className="mt-1.5 text-[11.5px] text-[var(--ink-soft)]">
              {found} of {crowd.length} match. Everyone else is dimmed, not hidden.
            </p>
          )}
        </div>
      </div>

      {/* The bands, as a legend you can point at. Tapping one lifts those
          faces out of the crowd rather than removing the others. */}
      <div className="pointer-events-none absolute bottom-0 right-0 z-20 p-3">
        <div
          className="pointer-events-auto flex max-w-[260px] flex-col gap-1 rounded-2xl border p-2"
          style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "var(--shadow-lift)" }}
        >
          {bands.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBand(band === b.id ? null : b.id)}
              className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left"
              style={band === b.id ? { background: "var(--sunk)" } : undefined}
            >
              <span className="min-w-0 truncate text-[12px] font-semibold">
                {b.lead && <span style={{ color: "var(--brand)" }}>● </span>}
                {b.label}
              </span>
              <span className="mono flex-none text-[11.5px] text-[var(--ink-soft)]">{b.members.length}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
