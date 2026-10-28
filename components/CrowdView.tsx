"use client";

import { useMemo, useRef, useState } from "react";
import type { CircleMember } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import { LABEL_CAP, LENSES, bandsFor, layoutCrowd, tierOfBand, type Lens } from "@/lib/crowd";
import { floorsFor, type Desk } from "@/lib/floorData";
import FloatingPage, { type PageSize } from "./FloatingPage";
import FloorView from "./FloorView";
import Avatar from "./Avatar";

/**
 * A crowd, re-arranged around you — in a window like every other section.
 *
 * The obvious answer to four hundred overlapping pins is a list, and on its
 * own it is the wrong one: a list destroys the room. You stop standing in a
 * crowd and start reading a spreadsheet, and the feeling of the crowd is
 * most of why anybody opened a map of people.
 *
 * So the default keeps every face on screen and draws the room as *groups*
 * — one island per band, sized by how many are in it, named on the island
 * itself, with the one that answers what you came for placed beside you.
 * That is the thing a person actually reads in a crowded room: not a rank
 * order, but a knot of people by the window and three around the coffee.
 * Nobody is dropped — the last island is always the rest of the room.
 *
 * The list is the other half, not a fallback: it is the view for reading
 * and comparing, and some people will live in it. Both show the same bands
 * in the same order, so switching never loses your place.
 *
 * And where the board has declared a building — see lib/floorData — there is
 * a third, which outranks both and opens by default. Rank is a picture of an
 * opinion only you can see; a floor plan is a shared frame two people can
 * stand in front of, and it answers the question actually being asked in a
 * co-working space, which is never "who is nearest" but "where do I go".
 */
type Mode = "floors" | "field" | "list";

export default function CrowdView({
  crowd,
  me,
  origin,
  size,
  onSize,
  onOpenMember,
  onMinimise,
  onClose,
  entityId,
  myDesk,
  onSetDesk,
}: {
  crowd: CircleMember[];
  me: CircleMe | null;
  /** Where each face starts, in panel pixels — their pin on the map. */
  origin: Map<string, { x: number; y: number }>;
  size: PageSize;
  onSize: (s: PageSize) => void;
  onOpenMember: (id: string) => void;
  onMinimise: () => void;
  onClose: () => void;
  /** The board being looked at — only it knows whether a building was declared. */
  entityId?: string | null;
  myDesk?: Desk | null;
  onSetDesk?: (d: Desk) => void;
}) {
  const floors = floorsFor(entityId);
  const [lens, setLens] = useState<Lens>("worth");
  const [mode, setMode] = useState<Mode>(floors ? "floors" : "field");
  const [q, setQ] = useState("");
  const [band, setBand] = useState<string | null>(null);

  /**
   * The canvas measures itself rather than the window: it lives in a panel
   * now, and that panel can be dragged, widened and resized under it.
   */
  const [area, setArea] = useState({ w: 900, h: 600 });
  const observed = useRef<ResizeObserver | null>(null);
  const measure = (el: HTMLDivElement | null) => {
    observed.current?.disconnect();
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w <= 0 || h <= 0) return;
      /**
       * Returning the previous object when nothing moved is what stops this
       * spinning: the ref callback runs on every render, which rebuilds the
       * observer, which reads immediately — and a fresh `{w, h}` each time
       * is a new value to React however identical it is, so the component
       * re-rendered itself to death. Rounded for the same reason, since a
       * fractional width can oscillate by a hundredth of a pixel forever.
       */
      setArea((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    read();
    observed.current = new ResizeObserver(read);
    observed.current.observe(el);
  };

  const { bands, why } = useMemo(() => bandsFor(lens, me, crowd), [lens, me, crowd]);
  const field = useMemo(() => layoutCrowd(bands, area.w, area.h), [bands, area]);

  const lead = bands.find((b) => b.lead);
  const labelLead = (lead?.members.length ?? 0) <= LABEL_CAP;

  /**
   * The weight a person is drawn at, in all three views.
   *
   * The bands already decide it; this is only the lookup. It lives here
   * because the field and the building both need the same answer, and a
   * second derivation is a second answer waiting to disagree with the first.
   */
  const tierOf = useMemo(() => {
    const t = new Map<string, "lead" | "mid" | "rest">();
    bands.forEach((b, i) => {
      const tier = tierOfBand(b, i);
      for (const x of b.members) t.set(x.id, tier);
    });
    return (id: string) => t.get(id) ?? "rest";
  }, [bands]);

  /**
   * First names, with a surname initial only where one wouldn't be enough.
   *
   * Two of the six were both "Vikram", which makes a label whose whole job
   * is identifying somebody do the opposite.
   */
  const labelOf = useMemo(() => {
    const names = lead?.members ?? [];
    const first = (m: CircleMember) => m.name.split(" ")[0];
    const initialled = (m: CircleMember) => {
      const [f, ...rest] = m.name.split(" ");
      return rest[0] ? `${f} ${rest[0][0]}.` : f;
    };
    const tally = (fn: (m: CircleMember) => string) => {
      const c = new Map<string, number>();
      for (const m of names) c.set(fn(m), (c.get(fn(m)) ?? 0) + 1);
      return c;
    };
    const byFirst = tally(first);
    const byInitial = tally(initialled);
    /**
     * As much name as it takes to tell two people apart, and no more.
     *
     * "Vikram" and "Vikram" became "Vikram V." and "Vikram V." — the same
     * collision one letter longer. Falling through to the full name when the
     * initial still clashes is the only form guaranteed to be unambiguous.
     */
    return new Map(
      names.map((m) => [
        m.id,
        (byFirst.get(first(m)) ?? 0) === 1
          ? first(m)
          : (byInitial.get(initialled(m)) ?? 0) === 1
            ? initialled(m)
            : m.name,
      ])
    );
  }, [lead]);

  const needle = q.trim().toLowerCase();
  const matches = (m: CircleMember) =>
    !needle ||
    [m.name, m.headline, m.company, m.lookingFor ?? "", ...m.helpWith]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  const found = needle ? crowd.filter(matches).length : 0;

  return (
    <FloatingPage
      title={`${crowd.length} people here`}
      emoji="✦"
      canGoBack={false}
      onBack={() => {}}
      size={size}
      onSize={onSize}
      onMinimise={onMinimise}
      onClose={onClose}
      padded={false}
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* ------------------------------------------------- the controls */}
        <div className="flex-none border-b border-[var(--line)] px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
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

            {/* Two ways to read the same crowd — same bands, same order. */}
            <span
              className="ml-auto flex items-center gap-0.5 rounded-full p-0.5"
              style={{ background: "var(--sunk)" }}
            >
              {(floors ? (["floors", "field", "list"] as const) : (["field", "list"] as const)).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={
                    mode === m ? { background: "var(--card)", color: "var(--ink)" } : { color: "var(--ink-soft)" }
                  }
                  title={
                    m === "floors"
                      ? "The building, level by level — where everyone actually is"
                      : m === "field"
                        ? "The room, arranged around you"
                        : "A list, for reading"
                  }
                >
                  {m === "floors" ? "Building" : m === "field" ? "Room" : "List"}
                </button>
              ))}
            </span>
          </div>

          <input
            className="input mt-2 py-1.5 text-[12.5px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search all ${crowd.length} — name, company, what they're after…`}
            aria-label="Search everyone here"
          />
          <p className="mt-1.5 text-[11px] text-[var(--ink-soft)]">
            {needle !== ""
              ? `${found} of ${crowd.length} match. Everyone else is dimmed, not hidden.`
              : mode === "floors"
                ? "Everyone at the desk they declared. The lens colours them — it doesn't hide anybody."
                : LENSES.find((l) => l.id === lens)?.blurb}
          </p>
        </div>

        {mode === "floors" && floors ? (
          <FloorView
            floors={floors}
            entityId={entityId ?? ""}
            crowd={crowd}
            tierOf={tierOf}
            me={me}
            myDesk={myDesk ?? null}
            onSetDesk={(d) => onSetDesk?.(d)}
            onOpenMember={onOpenMember}
            dim={(m) => needle !== "" && !matches(m)}
          />
        ) : mode === "field" ? (
          <div ref={measure} className="relative min-h-0 flex-1 overflow-hidden">
            {/* The islands, drawn. This is the layer that used to be a set of
                concentric rings and told you nothing: a shape per group,
                sized by how many are in it, so the picture carries what the
                legend was carrying on its own. */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              {field.islands.map((is) => (
                <circle
                  key={is.id}
                  cx={is.x}
                  cy={is.y}
                  r={is.r + 12}
                  fill={
                    is.tier === "lead"
                      ? "color-mix(in srgb, var(--brand) 8%, transparent)"
                      : "color-mix(in srgb, var(--ink) 4%, transparent)"
                  }
                  stroke={is.tier === "lead" ? "var(--brand)" : "var(--line)"}
                  strokeWidth={1}
                  opacity={is.tier === "lead" ? 0.55 : 0.8}
                />
              ))}
              {/* One line, to the one island that answers what you came for. */}
              {field.islands[0] && (
                <line
                  x1={field.cx}
                  y1={field.cy}
                  x2={field.islands[0].x}
                  y2={field.islands[0].y}
                  stroke="var(--brand)"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  opacity={0.4}
                />
              )}
            </svg>

            {field.seats.map((seat) => {
              const from = origin.get(seat.member.id);
              const dim = needle !== "" ? !matches(seat.member) : band != null && seat.band !== band;
              const named = seat.tier === "lead" && labelLead;
              return (
                <button
                  key={seat.member.id}
                  type="button"
                  onClick={() => onOpenMember(seat.member.id)}
                  className="crowd-seat absolute"
                  title={`${seat.member.name} — ${seat.member.headline}, ${seat.member.company}`}
                  style={
                    {
                      left: seat.x,
                      top: seat.y,
                      width: seat.size,
                      height: seat.size,
                      marginLeft: -seat.size / 2,
                      marginTop: -seat.size / 2,
                      opacity: dim ? 0.14 : 1,
                      zIndex: seat.tier === "lead" ? 4 : seat.tier === "mid" ? 2 : 1,
                      // Island by island, and within an island from the
                      // middle out: the room assembles in the order you are
                      // meant to read it.
                      animationDelay: `${Math.min(seat.island * 90 + Math.min(seat.order, 24) * 10, 1100)}ms`,
                      "--fx": `${(from?.x ?? field.cx) - seat.x}px`,
                      "--fy": `${(from?.y ?? field.cy) - seat.y}px`,
                    } as React.CSSProperties
                  }
                >
                  {seat.tier === "rest" ? (
                    <span
                      className="block h-full w-full rounded-full"
                      style={{ background: "color-mix(in srgb, var(--ink) 32%, transparent)" }}
                    />
                  ) : (
                    <span
                      className="relative block rounded-full"
                      // Ringed only where the island is small enough to carry names.
                      // Fifty people each ringed in brand colour is not emphasis,
                      // it is a red blob.
                      style={seat.tier === "lead" && labelLead ? { boxShadow: "0 0 0 3px var(--brand)" } : undefined}
                    >
                      <Avatar name={seat.member.name} size={seat.size} ring={seat.tier === "lead" && labelLead ? 3 : 2} local />
                    </span>
                  )}

                  {named && (
                    <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-semibold">
                      {labelOf.get(seat.member.id) ?? seat.member.name.split(" ")[0]}
                    </span>
                  )}

                  {/* Only where there's something to say. The sea of dots
                      carries a native tooltip instead, which also keeps four
                      hundred absolutely-positioned cards out of the DOM. */}
                  {seat.tier !== "rest" && (
                    <span
                      className={`crowd-card pointer-events-none absolute left-1/2 z-30 w-[220px] -translate-x-1/2 rounded-xl border p-2.5 text-left ${
                        seat.y > area.h * 0.62 ? "bottom-full mb-2" : "top-full mt-2"
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
                  )}
                </button>
              );
            })}

            {/* Every island says its own name, on the island. The legend
                becomes a filter rather than the only place the groups are
                written down. */}
            {field.islands.map((is) => {
              // Above the island, unless that would land it on top of you —
              // then below. A label sitting on the "You" badge reads as a
              // layout bug and hides the one fixed point in the view.
              const above = is.y - is.r - 16;
              const clash = Math.hypot(is.x - field.cx, above - field.cy) < 76;
              return (
              <button
                key={`lbl-${is.id}`}
                type="button"
                onClick={() => setBand(band === is.id ? null : is.id)}
                className="crowd-chip absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  left: is.x,
                  top: clash ? is.y + is.r + 16 : above,
                  zIndex: 6,
                  background: "var(--card)",
                  borderColor: is.tier === "lead" ? "var(--brand)" : "var(--line)",
                  color: is.tier === "lead" ? "var(--brand)" : "var(--ink)",
                  boxShadow: "var(--shadow-lift)",
                  opacity: band != null && band !== is.id ? 0.45 : 1,
                }}
              >
                {is.label} <span className="mono opacity-60">{is.count}</span>
              </button>
              );
            })}

            {/* You, at the centre, because every distance here is from you. */}
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: field.cx, top: field.cy, zIndex: 8 }}
            >
              <span className="relative block">
                <span className="crowd-you" />
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
        ) : (
          /* ----------------------------------------------------- the list */
          <div className="scroll-clean min-h-0 flex-1 overflow-y-auto p-3">
            {bands.map((b) => {
              const rows = b.members.filter((m) => !needle || matches(m));
              if (rows.length === 0) return null;
              return (
                <section key={b.id} className="mb-4 last:mb-0">
                  <p className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-semibold">
                      {b.lead && <span style={{ color: "var(--brand)" }}>● </span>}
                      {b.label}
                    </span>
                    <span className="mono text-[11px] text-[var(--ink-soft)]">{rows.length}</span>
                  </p>
                  <ul className="flex flex-col">
                    {rows.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => onOpenMember(m.id)}
                          className="tap flex w-full items-start gap-2.5 rounded-xl p-1.5 text-left hover:bg-[var(--sunk)]"
                        >
                          <Avatar name={m.name} size={32} local />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-semibold">{m.name}</span>
                            <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                              {m.headline} · {m.company}
                            </span>
                            {why.get(m.id) && (
                              <span className="mt-0.5 block text-[11px] leading-[1.4]" style={{ color: "var(--brand)" }}>
                                {why.get(m.id)}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </FloatingPage>
  );
}
