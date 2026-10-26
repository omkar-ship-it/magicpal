"use client";

import { useMemo, useState } from "react";
import {
  ASKS_TODAY,
  EVENTS_TODAY,
  IN_TODAY,
  SPACE,
  VISITOR,
  WORKERS,
  arrivedLabel,
  teamsInToday,
  worthMeeting,
  type Discipline,
  type Worker,
} from "@/lib/coworkData";
import Avatar from "./Avatar";

/**
 * A co-working floor, as the person sitting on it sees it.
 *
 * The order is the argument, and it is the opposite of how every community
 * tool for these spaces is built. Those open on a directory — a wall of
 * two hundred faces, which is a phone book and gets used like one. This
 * opens on the three people worth getting up for today, each with a
 * checkable reason, and only then offers the room.
 *
 * Second is the ask board, which is the thing a co-working WhatsApp group
 * is already trying to be and failing at: a question scrolls past in four
 * minutes and the person who could answer it was at lunch. Here an ask sits
 * with a face, a company and a desk, and stays until the day ends.
 *
 * Density is the point. Ninety-odd people in today out of two hundred odd
 * on the books is what a real floor looks like, and every design decision
 * here only matters at that scale — at twelve users any of this works.
 */
const DISCIPLINES: Array<Discipline | "All"> = [
  "All",
  "Founder",
  "Engineering",
  "Product",
  "Design",
  "Growth",
  "Sales",
  "People",
  "Finance",
];

export default function SpaceBoard() {
  const [filter, setFilter] = useState<Discipline | "All">("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Worker | null>(null);
  const [helped, setHelped] = useState<string[]>([]);

  const reasons = useMemo(() => worthMeeting(VISITOR, IN_TODAY, 3), []);
  const teams = useMemo(() => teamsInToday().slice(0, 6), []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return IN_TODAY.filter((w) => {
      if (filter !== "All" && w.discipline !== filter) return false;
      if (!needle) return true;
      return [w.name, w.role, w.company.name, w.company.what, w.workingOn, ...w.offers]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [filter, q]);

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------------ the floor */}
      <section className="card overflow-hidden p-0">
        <div
          className="px-5 py-4"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand) 16%, var(--card)), color-mix(in srgb, var(--brand) 4%, var(--card)))",
          }}
        >
          <p className="label m-0">{SPACE.operator} · members&rsquo; floor</p>
          <h2 className="mt-0.5 text-[21px] font-semibold leading-tight tracking-[-0.02em]">{SPACE.name}</h2>
          <p className="text-[12.5px] text-[var(--ink-soft)]">
            {SPACE.address} · {SPACE.floors}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Figure value={IN_TODAY.length} label="in today" live />
            <Figure value={SPACE.memberCount} label="members" />
            <Figure value={ASKS_TODAY.length} label="asks open" />
            <Figure value={EVENTS_TODAY.length} label="on today" />
          </div>
        </div>

        {/* Your own line. The product only works if you've said what you're
            here for, so it is stated back to you rather than hidden in a
            settings screen. */}
        <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3" style={{ borderColor: "var(--line)" }}>
          <Avatar name={VISITOR.name} size={30} />
          <span className="min-w-0 flex-1 text-[12.5px] leading-[1.35]">
            <span className="font-semibold">Tapped in · {VISITOR.role}, {VISITOR.company}</span>
            <span className="block text-[11.5px] text-[var(--ink-soft)]">
              Here for {VISITOR.needs.join(" and ")}
            </span>
          </span>
          <span className="pill" style={{ background: "color-mix(in srgb, var(--good) 14%, transparent)", color: "var(--good)" }}>
            On the floor
          </span>
        </div>
      </section>

      {/* ------------------------------------------- who to get up for */}
      <section>
        <h3 className="text-[15px] font-semibold">Worth getting up for</h3>
        <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
          Out of {IN_TODAY.length} people in today. Each with the reason, so you can check it before you walk over.
        </p>
        <div className="stagger mt-2.5 flex flex-col gap-2">
          {reasons.map((r) => (
            <article key={r.worker.id} className="card p-3.5">
              <div className="flex items-start gap-3">
                <Avatar name={r.worker.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold">
                    {r.worker.name}
                    <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                      {r.worker.zone}
                    </span>
                  </p>
                  <p className="truncate text-[12px] text-[var(--ink-soft)]">
                    {r.worker.role} · {r.worker.company.name}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-[1.45]" style={{ color: "var(--brand)" }}>
                    {r.why}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(r.worker)}>
                  Say hello
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(r.worker)}>
                  What they&rsquo;ll answer
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------- the ask board */}
      <section>
        <h3 className="text-[15px] font-semibold">Asked on this floor today</h3>
        <p className="mt-0.5 max-w-[62ch] text-[12.5px] text-[var(--ink-soft)]">
          The thing the building&rsquo;s WhatsApp group is trying to be. A question here sits with a face and a
          desk until the day ends, instead of scrolling past in four minutes.
        </p>
        <ul className="mt-2.5 flex flex-col gap-2">
          {ASKS_TODAY.slice(0, 7).map((w) => {
            const done = helped.includes(w.id);
            return (
              <li key={w.id} className="card flex items-start gap-3 p-3">
                <Avatar name={w.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-[1.45]">{w.ask}</p>
                  <p className="mt-1 truncate text-[11.5px] text-[var(--ink-soft)]">
                    {w.name} · {w.role}, {w.company.name} · {w.zone} · {arrivedLabel(w.arrivedMinsAgo)}
                  </p>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm flex-none ${done ? "btn-ghost" : "btn-primary"}`}
                  onClick={() => setHelped((h) => (h.includes(w.id) ? h : [...h, w.id]))}
                >
                  {done ? "Offered" : "I can help"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ------------------------------------------------ on today */}
      <section>
        <h3 className="text-[15px] font-semibold">On today</h3>
        <ul className="mt-2.5 grid gap-2 sm:grid-cols-3">
          {EVENTS_TODAY.map((e) => (
            <li key={e.id} className="card p-3">
              <p className="text-[11px] font-semibold" style={{ color: "var(--brand)" }}>
                {e.time}
              </p>
              <p className="mt-0.5 text-[12.5px] font-semibold leading-[1.3]">{e.name}</p>
              <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
                {e.where} · hosted by {e.host}
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--ink-soft)]">{e.going} going</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------ teams in today */}
      <section>
        <h3 className="text-[15px] font-semibold">Teams in today</h3>
        <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
          Who you&rsquo;re actually sharing the floor with.
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {teams.map((t) => (
            <li key={t.company.name} className="card flex items-center gap-2.5 px-3 py-2">
              <span className="flex items-center">
                {t.people.slice(0, 3).map((p, i) => (
                  <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }}>
                    <Avatar name={p.name} size={24} ring={2} />
                  </span>
                ))}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold">{t.company.name}</span>
                <span className="block truncate text-[11px] text-[var(--ink-soft)]">
                  {t.people.length} in · {t.company.what}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------- the room */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold">In today</h3>
          <span className="text-[12px] text-[var(--ink-soft)]">
            {shown.length} of {IN_TODAY.length}
          </span>
        </div>

        <input
          className="input mt-2"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, company, or what they'll answer…"
          aria-label="Search people in today"
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {DISCIPLINES.map((d) => (
            <button
              key={d}
              type="button"
              className="chip-toggle tap"
              data-on={filter === d ? "true" : "false"}
              aria-pressed={filter === d}
              onClick={() => setFilter(d)}
            >
              {d}
              {d !== "All" && (
                <span style={{ opacity: 0.7 }}> {IN_TODAY.filter((w) => w.discipline === d).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* The wall, and it is meant to feel like a wall — this is what two
            hundred members actually looks like, and it is the reason the
            three cards at the top of the page exist at all. */}
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shown.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setOpen(w)}
                className="card tap flex w-full items-start gap-2.5 p-2.5 text-left"
              >
                <Avatar name={w.name} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold">{w.name}</span>
                  <span className="block truncate text-[11px] text-[var(--ink-soft)]">{w.role}</span>
                  <span className="block truncate text-[11px] text-[var(--ink-soft)]">{w.company.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {shown.length === 0 && (
          <p className="mt-3 text-[12.5px] text-[var(--ink-soft)]">
            Nobody in today matches that. {WORKERS.length - IN_TODAY.length} more members aren&rsquo;t in.
          </p>
        )}
      </section>

      {open && <Card worker={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Figure({ value, label, live }: { value: number; label: string; live?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      {live && (
        <span className="relative flex h-2 w-2 self-center">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full"
            style={{ background: "var(--good)", opacity: 0.6 }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--good)" }} />
        </span>
      )}
      <span className="mono text-[19px] font-bold leading-none">{value}</span>
      <span className="text-[11.5px] text-[var(--ink-soft)]">{label}</span>
    </span>
  );
}

/**
 * One person, in full.
 *
 * Leads with what they'll answer rather than where they worked, because on
 * a shared floor the useful question is never "who are you" — it is "is it
 * worth interrupting you", and the answer to that is a list of two things.
 */
function Card({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end sm:place-items-center"
      style={{ background: "color-mix(in srgb, #000 42%, transparent)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={worker.name}
      >
        <div className="flex items-start gap-3">
          <Avatar name={worker.name} size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold leading-tight">{worker.name}</p>
            <p className="text-[12.5px] text-[var(--ink-soft)]">
              {worker.role} · {worker.company.name}
            </p>
            <p className="text-[11.5px] text-[var(--ink-soft)]">
              {worker.company.what} · {worker.memberMonths} months on this floor
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--ink-soft)]" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="mt-3 rounded-xl p-3" style={{ background: "var(--sunk)" }}>
          <p className="label m-0">Will answer</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {worker.offers.map((o) => (
              <li key={o} className="text-[12.5px] leading-[1.45]">
                · {o}
              </li>
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
        <p className="mt-1.5 text-[11.5px] text-[var(--ink-soft)]">
          {worker.zone} · {arrivedLabel(worker.arrivedMinsAgo)}
        </p>

        <div className="mt-3.5 flex gap-2">
          <button type="button" className="btn btn-primary btn-sm flex-1" onClick={onClose}>
            Send a hello
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
