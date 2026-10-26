"use client";

import { useMemo, useState } from "react";
import {
  BUILDING,
  OCCUPANTS,
  agoLabel,
  floorDistance,
  occupantsOn,
  type Floor,
  type Occupant,
} from "@/lib/buildingData";
import { matchesFor } from "@/lib/matching";
import type { CircleMe } from "@/lib/circleMe";
import Avatar from "./Avatar";

/**
 * The building, drawn as a section.
 *
 * Stacked bottom-up, because that is where the ground is. A list that
 * counts downward from the roof reads as a table of data; the same rows
 * stacked upward from a lobby read as a building you are standing in, and
 * the whole idea under test is whether that difference changes what
 * somebody does next.
 *
 * Each slab answers the lobby question in one line — how many people, how
 * many worth meeting, how far up — and opens to the faces. The lift core
 * running up the left is not decoration: it is what makes a row read as a
 * floor rather than as a list item, and it carries the "you are here"
 * marker, which is the only way a count becomes a direction.
 */
export default function BuildingStack({ me }: { me: CircleMe }) {
  /**
   * Your own floor, declared. Null until you say — and the empty state is
   * deliberate rather than a default of "ground": guessing it is exactly
   * what this design is arguing against.
   */
  const [myLevel, setMyLevel] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);

  /**
   * Who is worth meeting, scored once over everybody in the building, then
   * bucketed by floor. Running the matcher per floor would rank each floor
   * against itself and call the best of three a match.
   */
  const worthMeeting = useMemo(() => {
    const pool = OCCUPANTS.map((o) => o.member);
    const ranked = matchesFor(me, pool, { limit: 12 });
    return new Map(ranked.map((m) => [m.member.id, m]));
  }, [me]);

  const byLevel = useMemo(() => {
    const map = new Map<number, { people: Occupant[]; matches: number }>();
    for (const f of BUILDING.floors) {
      const people = occupantsOn(f.level);
      map.set(f.level, {
        people,
        matches: people.filter((p) => worthMeeting.has(p.member.id)).length,
      });
    }
    return map;
  }, [worthMeeting]);

  const total = OCCUPANTS.length;
  const totalMatches = [...byLevel.values()].reduce((n, v) => n + v.matches, 0);
  const busiest = [...byLevel.entries()].sort((a, b) => b[1].matches - a[1].matches)[0];

  // Top floor first in the DOM, so the building stacks upward on screen.
  const floors = [...BUILDING.floors].sort((a, b) => b.level - a.level);

  return (
    <div className="flex flex-col gap-3">
      {/* ------------------------------------------------- the lobby line */}
      <div className="card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">In this building</p>
        <h2 className="mt-0.5 text-[19px] font-semibold leading-tight">{BUILDING.name}</h2>
        <p className="text-[12.5px] text-[var(--ink-soft)]">{BUILDING.address}</p>
        <p className="mt-2 text-[13px] leading-[1.5]">
          <strong>{total} people</strong> here right now.{" "}
          {totalMatches > 0 ? (
            <>
              <strong style={{ color: "var(--brand)" }}>{totalMatches} worth meeting</strong>, and most of them are
              on <strong>floor {BUILDING.floors.find((f) => f.level === busiest[0])?.label}</strong>.
            </>
          ) : (
            "Nobody here lines up with what you're after yet."
          )}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setPicking((v) => !v)}>
            {myLevel == null ? "I'm on floor…" : `You're on ${BUILDING.floors.find((f) => f.level === myLevel)?.label}`}
          </button>
          {myLevel != null && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMyLevel(null)}>
              Clear
            </button>
          )}
          {myLevel != null && (
            <span className="text-[11.5px] text-[var(--ink-soft)]">
              Expires in 90 minutes, like a live location.
            </span>
          )}
        </div>

        {picking && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {[...BUILDING.floors].reverse().map((f) => (
              <button
                key={f.level}
                type="button"
                className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                style={
                  myLevel === f.level
                    ? { background: "var(--brand)", color: "#fff" }
                    : { background: "var(--sunk)", color: "var(--ink-soft)" }
                }
                onClick={() => {
                  setMyLevel(f.level);
                  setPicking(false);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --------------------------------------------------- the elevation */}
      <div className="flex flex-col">
        {floors.map((f) => {
          const v = byLevel.get(f.level)!;
          return (
            <FloorSlab
              key={f.level}
              floor={f}
              people={v.people}
              matches={v.matches}
              here={myLevel === f.level}
              distance={myLevel == null ? null : floorDistance(myLevel, f.level)}
              expanded={open === f.level}
              worthMeeting={worthMeeting}
              onToggle={() => setOpen(open === f.level ? null : f.level)}
            />
          );
        })}
        {/* The ground the whole thing sits on — it closes the drawing. */}
        <div className="h-2 rounded-b-xl" style={{ background: "var(--line)" }} />
      </div>
    </div>
  );
}

function FloorSlab({
  floor,
  people,
  matches,
  here,
  distance,
  expanded,
  worthMeeting,
  onToggle,
}: {
  floor: Floor;
  people: Occupant[];
  matches: number;
  here: boolean;
  distance: string | null;
  expanded: boolean;
  worthMeeting: Map<string, { why: string }>;
  onToggle: () => void;
}) {
  const faces = people.slice(0, 5);
  const extra = people.length - faces.length;
  const empty = people.length === 0;

  return (
    <div className="flex items-stretch">
      {/* The lift core. One continuous column down the whole drawing, which
          is what stops twelve rows reading as twelve cards. */}
      <div className="relative flex w-11 flex-none justify-center" style={{ background: "var(--sunk)" }}>
        <span className="absolute inset-y-0 w-px" style={{ background: "var(--line)" }} />
        <span
          className="relative mt-3 grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold"
          style={
            here
              ? { background: "var(--brand)", color: "#fff" }
              : { background: "var(--card)", color: "var(--ink-soft)", boxShadow: "0 0 0 1px var(--line)" }
          }
        >
          {floor.label}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="min-w-0 flex-1 border-b border-l px-3 py-2.5 text-left"
        style={{
          borderColor: "var(--line)",
          // A floor with somebody worth meeting on it is the only thing on
          // this screen that should pull the eye up the building.
          background: matches > 0 ? "color-mix(in srgb, var(--brand) 7%, var(--card))" : "var(--card)",
          opacity: empty ? 0.62 : 1,
        }}
      >
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold">
              {floor.tenant ?? `Floor ${floor.label}`}
              {here && <span style={{ color: "var(--brand)" }}> · you are here</span>}
            </span>
            <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
              {empty ? (
                "Nobody right now"
              ) : (
                <>
                  {people.length} {people.length === 1 ? "person" : "people"}
                  {matches > 0 && (
                    <span style={{ color: "var(--brand)" }}> · {matches} worth meeting</span>
                  )}
                  {distance && !here && <> · {distance}</>}
                </>
              )}
            </span>
          </span>

          {!empty && (
            <span className="flex flex-none items-center">
              {faces.map((o, i) => (
                <span key={o.member.id} style={{ marginLeft: i === 0 ? 0 : -9, zIndex: faces.length - i }}>
                  <Avatar name={o.member.name} size={24} ring={2} />
                </span>
              ))}
              {extra > 0 && (
                <span
                  className="ml-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-[10.5px] font-semibold"
                  style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
                >
                  +{extra}
                </span>
              )}
            </span>
          )}
        </span>

        {expanded && !empty && (
          <span className="mt-2.5 block border-t pt-2.5" style={{ borderColor: "var(--line)" }}>
            {people.map((o) => {
              const m = worthMeeting.get(o.member.id);
              return (
                <span key={o.member.id} className="mb-2 flex items-start gap-2.5 last:mb-0">
                  <Avatar name={o.member.name} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold">
                      {o.member.name}
                      {o.source === "host" && (
                        <span className="text-[var(--ink-soft)]"> · checked in at reception</span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--ink-soft)]">
                      {o.member.headline} · {o.member.company}
                    </span>
                    {m ? (
                      <span className="mt-0.5 block text-[11px]" style={{ color: "var(--brand)" }}>
                        {m.why}
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-[10.5px] text-[var(--ink-soft)]">
                        said so {agoLabel(o.agoMinutes)}
                      </span>
                    )}
                  </span>
                </span>
              );
            })}
          </span>
        )}
      </button>
    </div>
  );
}
