"use client";

import { useMemo, useState } from "react";
import {
  ASKS_TODAY,
  ENTRANCE,
  EVENTS_TODAY,
  FLOOR_PLAN,
  facesShown,
  IN_TODAY,
  SPACE,
  VISITOR,
  arrivedLabel,
  seatIn,
  worthMeeting,
  zoneBox,
  type Worker,
  type Zone,
} from "@/lib/coworkData";
import Avatar from "./Avatar";

/**
 * The floor, as a map — the same shape as every other surface in this
 * product, which is the point.
 *
 * A directory of the building was the wrong answer twice over. It reads
 * like a phone book, and it throws away the one thing this product has
 * that a membership portal doesn't: position. So the plan *is* the map,
 * faces sit on it, and everything else — who's worth meeting, what's being
 * asked, what's on — is summoned over the top rather than parked beside it.
 *
 * Why a plan rather than Mapbox: at the scale of one building a street map
 * is a grey rectangle, and placing people at metre precision inside it
 * would be inventing indoor positioning that does not exist. The zone is
 * the honest unit — it's something a person can declare about themselves,
 * the same way they declare a floor or a check-in.
 */
type Panel = "forYou" | "asks" | "people" | "events" | null;

export default function SpaceMap() {
  const [panel, setPanel] = useState<Panel>("forYou");
  const [selected, setSelected] = useState<Worker | null>(null);
  const [zoneOpen, setZoneOpen] = useState<Zone | null>(null);
  const [q, setQ] = useState("");

  const reasons = useMemo(() => worthMeeting(VISITOR, IN_TODAY, 3), []);
  const highlighted = useMemo(() => new Set(reasons.map((r) => r.worker.id)), [reasons]);

  const byZone = useMemo(() => {
    const map = new Map<Zone, Worker[]>();
    for (const w of IN_TODAY) {
      const list = map.get(w.zone);
      if (list) list.push(w);
      else map.set(w.zone, [w]);
    }
    // Anybody worth meeting sits at the front of their zone, so the face
    // that matters is never the one hidden behind the "+22".
    for (const list of map.values()) {
      list.sort((a, b) => Number(highlighted.has(b.id)) - Number(highlighted.has(a.id)));
    }
    return map;
  }, [highlighted]);

  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return null;
    return IN_TODAY.filter((w) =>
      [w.name, w.role, w.company.name, ...w.offers].join(" ").toLowerCase().includes(needle)
    );
  }, [q]);

  const foundIds = useMemo(() => new Set((found ?? []).map((w) => w.id)), [found]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "var(--sunk)" }}>
      {/* ------------------------------------------------------- the plan */}
      <div className="absolute inset-0">
        {/* Room for the chrome: the top bar and the dock float over this, and
            a plan that runs underneath them loses its top row of labels to a
            search box. */}
        <div className="relative mx-auto h-full w-full max-w-[1500px] px-3 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20">
          <div
            className="relative h-full w-full rounded-2xl border"
            style={{ borderColor: "var(--line)", background: "var(--card)" }}
          >
            {FLOOR_PLAN.map((box) => {
              const people = byZone.get(box.id) ?? [];
              const faces = people.slice(0, facesShown(box));
              const extra = people.length - faces.length;
              const hot = people.some((p) => highlighted.has(p.id));
              return (
                <div
                  key={box.id}
                  className="absolute rounded-xl border transition-colors"
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                    borderColor: hot ? "var(--brand)" : "var(--line)",
                    background: hot
                      ? "color-mix(in srgb, var(--brand) 6%, var(--card))"
                      : "var(--sunk)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setZoneOpen(box.id)}
                    className="absolute left-2 top-1.5 text-left"
                  >
                    <span className="block text-[11.5px] font-semibold leading-none">{box.id}</span>
                    <span className="mt-0.5 block text-[10px] leading-none text-[var(--ink-soft)]">
                      {people.length} in · {box.note}
                    </span>
                  </button>

                  {faces.map((w, i) => {
                    const seat = seatIn(box, i, Math.max(faces.length, 1));
                    const dim = found != null && !foundIds.has(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelected(w)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity"
                        style={{
                          left: `${((seat.x - box.x) / box.w) * 100}%`,
                          top: `${((seat.y - box.y) / box.h) * 100}%`,
                          opacity: dim ? 0.25 : 1,
                        }}
                        title={`${w.name} · ${w.role}, ${w.company.name}`}
                      >
                        <span className="relative block">
                          <Avatar
                            name={w.name}
                            size={highlighted.has(w.id) ? 34 : 28}
                            ring={2}
                            local
                          />
                          {highlighted.has(w.id) && (
                            <span
                              className="absolute inset-0 rounded-full"
                              style={{ boxShadow: "0 0 0 2.5px var(--brand)" }}
                            />
                          )}
                          {w.ask && (
                            <span
                              className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full text-[9px] font-bold text-white"
                              style={{ background: "var(--warn)" }}
                              title="Asked the floor today"
                            >
                              ?
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {extra > 0 && (
                    <button
                      type="button"
                      onClick={() => setZoneOpen(box.id)}
                      className="absolute bottom-1.5 right-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                      style={{ background: "var(--card)", color: "var(--ink-soft)", boxShadow: "0 0 0 1px var(--line)" }}
                    >
                      +{extra} more
                    </button>
                  )}
                </div>
              );
            })}

            {/* You, at the lifts. The fixed point everybody orients from. */}
            <div
              className="absolute rounded-xl border border-dashed"
              style={{
                left: `${ENTRANCE.x}%`,
                top: `${ENTRANCE.y}%`,
                width: `${ENTRANCE.w}%`,
                height: `${ENTRANCE.h}%`,
                borderColor: "var(--line)",
              }}
            >
              <span className="absolute left-2 top-1.5 text-[11.5px] font-semibold">{ENTRANCE.label}</span>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="relative block">
                  <Avatar name={VISITOR.name} size={34} ring={3} local />
                  <span
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: "var(--brand)" }}
                  >
                    You
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- the top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-2 rounded-[20px] border px-3 py-2 backdrop-blur sm:flex-row sm:items-center"
          style={{ background: "color-mix(in srgb, var(--card) 92%, transparent)", borderColor: "var(--line)", boxShadow: "var(--shadow-lift)" }}>
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="grid h-7 w-7 flex-none place-items-center rounded-full text-[12px] text-white"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
            >
              ✦
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold leading-tight">{SPACE.name}</span>
              <span className="block truncate text-[10.5px] leading-tight text-[var(--ink-soft)]">
                {IN_TODAY.length} in today · {SPACE.memberCount} members
              </span>
            </span>
          </div>
          <input
            className="input min-w-0 flex-1 py-1.5 text-[12.5px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the floor — name, company, what they'll answer…"
            aria-label="Search the floor"
          />
          {found && (
            <span className="flex-none text-[11.5px] text-[var(--ink-soft)]">{found.length} on the floor</span>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------- the dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3">
        <div
          className="pointer-events-auto flex items-center gap-1 rounded-[22px] border p-1.5 backdrop-blur"
          style={{ background: "color-mix(in srgb, var(--card) 92%, transparent)", borderColor: "var(--line)", boxShadow: "var(--shadow-lift)" }}
        >
          <Tab on={panel === "forYou"} onClick={() => setPanel(panel === "forYou" ? null : "forYou")} label="For you" count={reasons.length} />
          <Tab on={panel === "asks"} onClick={() => setPanel(panel === "asks" ? null : "asks")} label="Asks" count={ASKS_TODAY.length} />
          <Tab on={panel === "people"} onClick={() => setPanel(panel === "people" ? null : "people")} label="People" count={IN_TODAY.length} />
          <Tab on={panel === "events"} onClick={() => setPanel(panel === "events" ? null : "events")} label="On today" count={EVENTS_TODAY.length} />
        </div>
      </div>

      {/* ------------------------------------------------- floating panels */}
      {panel && (
        <Floating title={PANEL_TITLE[panel]} onClose={() => setPanel(null)}>
          {panel === "forYou" && (
            <>
              <p className="mb-2 text-[12px] leading-[1.5] text-[var(--ink-soft)]">
                Out of {IN_TODAY.length} people on the floor. Ringed on the plan so you can see where they&rsquo;re
                sitting before you get up.
              </p>
              {reasons.map((r) => (
                <article key={r.worker.id} className="card mb-2 p-3">
                  <button type="button" className="flex w-full items-start gap-2.5 text-left" onClick={() => setSelected(r.worker)}>
                    <Avatar name={r.worker.name} size={38} local />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{r.worker.name}</span>
                      <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                        {r.worker.role} · {r.worker.company.name} · {r.worker.zone}
                      </span>
                      <span className="mt-1 block text-[12px] leading-[1.45]" style={{ color: "var(--brand)" }}>
                        {r.why}
                      </span>
                    </span>
                  </button>
                </article>
              ))}
            </>
          )}

          {panel === "asks" && (
            <>
              <p className="mb-2 text-[12px] leading-[1.5] text-[var(--ink-soft)]">
                What the building&rsquo;s WhatsApp group is trying to be. Each one sits with a face and a desk
                until the day ends.
              </p>
              {ASKS_TODAY.slice(0, 10).map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelected(w)}
                  className="card mb-2 flex w-full items-start gap-2.5 p-3 text-left"
                >
                  <Avatar name={w.name} size={32} local />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] leading-[1.45]">{w.ask}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-soft)]">
                      {w.name} · {w.company.name} · {w.zone}
                    </span>
                  </span>
                </button>
              ))}
            </>
          )}

          {panel === "people" && (
            <ul className="grid grid-cols-2 gap-2">
              {(found ?? IN_TODAY).map((w) => (
                <li key={w.id}>
                  <button type="button" onClick={() => setSelected(w)} className="card flex w-full items-start gap-2 p-2 text-left">
                    <Avatar name={w.name} size={28} local />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-semibold">{w.name}</span>
                      <span className="block truncate text-[10.5px] text-[var(--ink-soft)]">{w.company.name}</span>
                      <span className="block truncate text-[10.5px] text-[var(--ink-soft)]">{w.zone}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {panel === "events" && (
            <ul className="flex flex-col gap-2">
              {EVENTS_TODAY.map((e) => (
                <li key={e.id} className="card p-3">
                  <p className="text-[11px] font-semibold" style={{ color: "var(--brand)" }}>{e.time}</p>
                  <p className="mt-0.5 text-[12.5px] font-semibold leading-[1.3]">{e.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
                    {e.where} · hosted by {e.host} · {e.going} going
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Floating>
      )}

      {/* A zone, opened from the plan. */}
      {zoneOpen && (
        <Floating title={`${zoneOpen} · ${(byZone.get(zoneOpen) ?? []).length} in`} onClose={() => setZoneOpen(null)}>
          <p className="mb-2 text-[12px] text-[var(--ink-soft)]">{zoneBox(zoneOpen)?.note}</p>
          <ul className="flex flex-col gap-1.5">
            {(byZone.get(zoneOpen) ?? []).map((w) => (
              <li key={w.id}>
                <button type="button" onClick={() => setSelected(w)} className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-[var(--sunk)]">
                  <Avatar name={w.name} size={30} local />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold">
                      {w.name}
                      {highlighted.has(w.id) && <span style={{ color: "var(--brand)" }}> · worth meeting</span>}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--ink-soft)]">
                      {w.role} · {w.company.name}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Floating>
      )}

      {selected && <PersonCard worker={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

const PANEL_TITLE: Record<Exclude<Panel, null>, string> = {
  forYou: "Worth getting up for",
  asks: "Asked on this floor today",
  people: "On the floor",
  events: "On today",
};

function Tab({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[16px] px-3 py-1.5 text-[12px] font-semibold"
      style={on ? { background: "var(--brand)", color: "#fff" } : { color: "var(--ink-soft)" }}
    >
      {label}
      <span style={{ opacity: 0.75 }}> {count}</span>
    </button>
  );
}

/** A panel over the plan, never beside it — the map stays the surface. */
function Floating({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside
      className="absolute bottom-20 left-3 right-3 z-30 flex max-h-[62vh] flex-col overflow-hidden rounded-2xl border sm:right-auto sm:w-[380px]"
      style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "var(--shadow-lift)" }}
    >
      <header className="flex items-center justify-between border-b px-3.5 py-2.5" style={{ borderColor: "var(--line)" }}>
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--ink-soft)]">
          ✕
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </aside>
  );
}

function PersonCard({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-40 grid place-items-end sm:place-items-center"
      style={{ background: "color-mix(in srgb, #000 40%, transparent)" }}
      onClick={onClose}
      role="presentation"
    >
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={worker.name}>
        <div className="flex items-start gap-3">
          <Avatar name={worker.name} size={50} local />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold leading-tight">{worker.name}</p>
            <p className="text-[12.5px] text-[var(--ink-soft)]">
              {worker.role} · {worker.company.name}
            </p>
            <p className="text-[11.5px] text-[var(--ink-soft)]">
              {worker.zone} · {arrivedLabel(worker.arrivedMinsAgo)} · {worker.memberMonths} months here
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--ink-soft)]">✕</button>
        </div>

        <div className="mt-3 rounded-xl p-3" style={{ background: "var(--sunk)" }}>
          <p className="label m-0">Will answer</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {worker.offers.map((o) => (
              <li key={o} className="text-[12.5px] leading-[1.45]">· {o}</li>
            ))}
          </ul>
        </div>

        <p className="mt-2.5 text-[12.5px] leading-[1.5]">
          <span className="font-semibold">Working on</span> — {worker.workingOn}
        </p>
        {worker.ask && (
          <p className="mt-1.5 text-[12.5px] leading-[1.5]" style={{ color: "var(--brand)" }}>
            Asked the floor today: &ldquo;{worker.ask}&rdquo;
          </p>
        )}

        <div className="mt-3.5 flex gap-2">
          <button type="button" className="btn btn-primary btn-sm flex-1" onClick={onClose}>Say hello</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Later</button>
        </div>
      </div>
    </div>
  );
}
