"use client";

import { useMemo, useRef, useState } from "react";
import type { CircleMember } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import { LABEL_CAP, LENSES, bandsFor, seatCrowd, type Lens } from "@/lib/crowd";
import FloatingPage, { type PageSize } from "./FloatingPage";
import Avatar from "./Avatar";

/**
 * A crowd, re-arranged around you — in a window like every other section.
 *
 * The obvious answer to four hundred overlapping pins is a list, and on its
 * own it is the wrong one: a list destroys the room. You stop standing in a
 * crowd and start reading a spreadsheet, and the feeling of the crowd is
 * most of why anybody opened a map of people.
 *
 * So the default keeps every face on screen and *changes what distance
 * means*. You are in the middle, the people who answer what you came in for
 * sit on their own ring around you, and the rest of the room recedes
 * outward — smaller, quieter, entirely there. Near still means matters, so
 * there is no second visual language to learn.
 *
 * The list is the other half, not a fallback: it is the view for reading
 * and comparing, and some people will live in it. Both show the same bands
 * in the same order, so switching never loses your place.
 */
type Mode = "field" | "list";

export default function CrowdView({
  crowd,
  me,
  origin,
  size,
  onSize,
  onOpenMember,
  onMinimise,
  onClose,
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
}) {
  const [lens, setLens] = useState<Lens>("worth");
  const [mode, setMode] = useState<Mode>("field");
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
  const field = useMemo(() => seatCrowd(bands, area.w, area.h), [bands, area]);

  const lead = bands.find((b) => b.lead);
  const leadBand = lead?.id ?? null;
  const labelLead = (lead?.members.length ?? 0) <= LABEL_CAP;

  /**
   * First names, with a surname initial only where one wouldn't be enough.
   *
   * Two of the six were both "Vikram", which makes a label whose whole job
   * is identifying somebody do the opposite.
   */
  const labelOf = useMemo(() => {
    const names = lead?.members ?? [];
    const firstCount = new Map<string, number>();
    for (const m of names) {
      const f = m.name.split(" ")[0];
      firstCount.set(f, (firstCount.get(f) ?? 0) + 1);
    }
    return new Map(
      names.map((m) => {
        const [first, ...rest] = m.name.split(" ");
        const initial = rest[0]?.[0];
        return [m.id, (firstCount.get(first) ?? 0) > 1 && initial ? `${first} ${initial}.` : first];
      })
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
              {(["field", "list"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={
                    mode === m ? { background: "var(--card)", color: "var(--ink)" } : { color: "var(--ink-soft)" }
                  }
                  title={m === "field" ? "The room, arranged around you" : "A list, for reading"}
                >
                  {m === "field" ? "Room" : "List"}
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
              : LENSES.find((l) => l.id === lens)?.blurb}
          </p>
        </div>

        {mode === "field" ? (
          <div ref={measure} className="relative min-h-0 flex-1 overflow-hidden">
            {/* The structure, drawn. Faint rings make the field read as
                designed rather than scattered, and a line from you to each
                of the six makes "worth crossing the room for" literal. */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              {field.rings.map((r, i) => (
                <ellipse
                  key={i}
                  cx={field.cx}
                  cy={field.cy}
                  rx={r}
                  ry={r * field.squash}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth={1}
                  opacity={0.55}
                />
              ))}
              {labelLead &&
                field.seats
                  .filter((s) => s.band === leadBand)
                  .map((s) => (
                    <line
                      key={s.member.id}
                      x1={field.cx}
                      y1={field.cy}
                      x2={s.x}
                      y2={s.y}
                      stroke="var(--brand)"
                      strokeWidth={1.5}
                      opacity={0.3}
                    />
                  ))}
            </svg>

            {field.seats.map((seat) => {
              const from = origin.get(seat.member.id);
              const dim = needle !== "" ? !matches(seat.member) : band != null && seat.band !== band;
              const isLead = seat.band === leadBand;
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
                      opacity: dim ? 0.16 : 1,
                      zIndex: isLead ? 3 : 1,
                      // The flight, cascading outward ring by ring: the crowd
                      // assembles around you rather than appearing fully
                      // formed, which is the half-second that explains what
                      // this view is.
                      animationDelay: `${Math.min(seat.ring, 9) * 55}ms`,
                      "--fx": `${(from?.x ?? field.cx) - seat.x}px`,
                      "--fy": `${(from?.y ?? field.cy) - seat.y}px`,
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="relative block rounded-full"
                    style={isLead ? { boxShadow: "0 0 0 3px var(--brand)" } : undefined}
                  >
                    <Avatar name={seat.member.name} size={seat.size} ring={isLead ? 3 : 2} local />
                  </span>

                  {isLead && labelLead && (
                    <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-semibold">
                      {labelOf.get(seat.member.id) ?? seat.member.name.split(" ")[0]}
                    </span>
                  )}

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
                </button>
              );
            })}

            {/* You, at the centre, because every distance here is from you. */}
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: field.cx, top: field.cy, zIndex: 5 }}
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

            {/* The bands, as a legend you can point at. */}
            <div
              className="absolute bottom-2 right-2 z-20 flex max-w-[240px] flex-col gap-0.5 rounded-2xl border p-1.5"
              style={{
                background: "color-mix(in srgb, var(--card) 94%, transparent)",
                borderColor: "var(--line)",
                backdropFilter: "blur(8px)",
              }}
            >
              {bands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBand(band === b.id ? null : b.id)}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-1 text-left"
                  style={band === b.id ? { background: "var(--sunk)" } : undefined}
                >
                  <span className="min-w-0 truncate text-[11.5px] font-semibold">
                    {b.lead && <span style={{ color: "var(--brand)" }}>● </span>}
                    {b.label}
                  </span>
                  <span className="mono flex-none text-[11px] text-[var(--ink-soft)]">{b.members.length}</span>
                </button>
              ))}
            </div>
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
