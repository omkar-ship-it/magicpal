"use client";

import { avatarUrl } from "@/lib/avatar";
import { useState } from "react";
import type { CircleEvent, CircleMember } from "@/lib/circleData";
import { matchesFor, daysUntilNextBatch } from "@/lib/matching";
import { IconSparkle } from "./Icons";
import { IconBeacon, IconCalendar, IconChat, IconChevronDown, IconX } from "./Icons";
import type { CircleMe } from "@/lib/circleMe";

export type DigestLine = {
  id: string;
  icon: React.ReactNode;
  /** Brand-coloured for the one thing that's live right now. */
  hot?: boolean;
  headline: string;
  detail: string;
  faces?: string[];
  onClick: () => void;
};

/**
 * Why you'd open this tomorrow.
 *
 * The failure mode of every alumni product is that nothing changes between
 * visits and nothing tells you it did. This is the answer to "what's
 * different since last time", and it's built entirely from signals members
 * emit by existing — travelling, joining, calling a meetup — rather than
 * from anyone posting. In a class where eight people write and six hundred
 * don't, that distinction is the whole product.
 */
export default function CircleDigest({
  me,
  events,
  newPostCount,
  pool,
  onMatches,
  onEvent,
  onFeed,
  onDismiss,
}: {
  me: CircleMe;
  events: CircleEvent[];
  newPostCount: number;
  /** Open network only: the roster to match against. */
  pool?: CircleMember[];
  onMatches?: () => void;
  onEvent: (id: string) => void;
  onFeed: () => void;
  onDismiss: () => void;
}) {
  const lines = buildDigest(me, events, newPostCount, { event: onEvent, feed: onFeed });
  // Out in the open, the most actionable thing on any given day isn't an
  // event or a post — it's the three people picked for you this week.
  if (pool && onMatches) {
    const picks = matchesFor(me, pool, { limit: 3 });
    if (picks.length > 0) {
      const days = daysUntilNextBatch();
      lines.unshift({
        id: "matches",
        icon: <IconSparkle size={16} />,
        hot: true,
        headline: `${picks.length} introductions for you`,
        detail: `${picks[0].member.name.split(" ")[0]}, ${picks[1]?.member.name.split(" ")[0] ?? ""} and one more · new set in ${days}d`,
        faces: picks.map((p) => p.member.name),
        onClick: onMatches,
      });
    }
  }
  // A phone screen is mostly map; four stacked rows covered all of it. There
  // it opens as one line you can tap to expand, and only the top item shows.
  const [open, setOpen] = useState(false);
  if (lines.length === 0) return null;
  const top = lines[0];

  return (
    <div className="pointer-events-none fixed bottom-[82px] left-3 right-3 z-[1200] sm:bottom-24 sm:right-auto sm:w-[330px] sm:left-5">
      <div
        className="pointer-events-auto rounded-3xl border border-[var(--line)] p-2 sm:p-3"
        style={{ background: "color-mix(in srgb, var(--card) 96%, transparent)", backdropFilter: "blur(14px)", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="hidden items-center gap-2 px-1 pb-1.5 sm:flex">
          <span className="text-[12px] font-semibold">This week in your world</span>
          <button onClick={onDismiss} className="win-btn ml-auto flex-none" title="Dismiss" aria-label="Dismiss">
            <IconX size={14} />
          </button>
        </div>

        {/* Phone: collapsed to the single most actionable line. Tapping the
            row does that line's thing — the chevron is what discloses the
            rest. Wiring the row to expand instead made the most useful tap
            target on the screen do nothing but reveal a list. */}
        <div className="flex items-center gap-1 sm:hidden">
          <button onClick={top.onClick} className="tap flex min-w-0 flex-1 items-center gap-2 rounded-2xl p-1.5 text-left">
            <Glyph line={top} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold leading-tight">{top.headline}</span>
              <span className="block truncate text-[11px] text-[var(--ink-soft)]">{top.detail}</span>
            </span>
          </button>
          {lines.length > 1 && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="win-btn flex-none"
              title={open ? "Show less" : `${lines.length - 1} more`}
              aria-label={open ? "Show less" : `${lines.length - 1} more`}
              aria-expanded={open}
            >
              <IconChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : undefined }} />
            </button>
          )}
          <button onClick={onDismiss} className="win-btn flex-none" title="Dismiss" aria-label="Dismiss">
            <IconX size={14} />
          </button>
        </div>

        <div className={`${open ? "flex" : "hidden"} flex-col gap-0.5 sm:flex`}>
          {(open ? lines : lines).map((l, i) => (
            <button
              key={l.id}
              onClick={l.onClick}
              className={`flex w-full items-center gap-2.5 rounded-2xl p-2 text-left transition-colors hover:bg-[var(--sunk)] ${i === 0 ? "hidden sm:flex" : "flex"} sm:flex`}
            >
              <Glyph line={l} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold leading-tight">{l.headline}</span>
                <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">{l.detail}</span>
              </span>
              {l.faces && l.faces.length > 0 && (
                <span className="flex flex-none -space-x-2">
                  {l.faces.slice(0, 3).map((n) => (
                    <span key={n} className="avatar h-6 w-6 text-[9px]" style={{ borderColor: "var(--card)", borderWidth: 2 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl(n)} alt="" />
                    </span>
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The leading mark: tinted for the one line that's live, quiet for the rest. */
function Glyph({ line }: { line: DigestLine }) {
  return (
    <span
      className={`grid h-8 w-8 flex-none place-items-center rounded-xl${line.hot ? " beacon-ring" : ""}`}
      style={
        line.hot
          ? { background: "var(--brand)", color: "#fff" }
          : { background: "var(--sunk)", color: "var(--ink-soft)" }
      }
    >
      {line.icon}
    </span>
  );
}

/**
 * The lines themselves, ranked by how much they'd actually make someone act.
 * Somebody landing in your city this week beats a milestone post, every time.
 */
function buildDigest(
  me: CircleMe,
  events: CircleEvent[],
  newPostCount: number,
  go: { event: (id: string) => void; feed: () => void }
): DigestLine[] {
  const out: DigestLine[] = [];

  const live = events.find((e) => e.liveNow);
  if (live) {
    out.push({
      id: "live",
      icon: <IconBeacon size={16} />,
      hot: true,
      headline: `${live.name} is happening now`,
      detail: live.venue ? `${live.venue} — beacon on to be found` : "Online — join from anywhere",
      onClick: () => go.event(live.id),
    });
  }

  const nearby = events.filter((e) => e.cityId === me.cityId && !e.liveNow && e.daysAway <= 14);
  if (nearby.length > 0) {
    out.push({
      id: "nearby",
      icon: <IconCalendar size={16} />,
      headline: `${nearby.length} meetup${nearby.length === 1 ? "" : "s"} in your city`,
      detail: `${nearby[0].name} · ${nearby[0].dateLabel}`,
      onClick: () => go.event(nearby[0].id),
    });
  }

  if (newPostCount > 0) {
    out.push({
      id: "posts",
      icon: <IconChat size={16} />,
      headline: `${newPostCount} new in the feed`,
      detail: "Asks, hiring and a few milestones",
      onClick: go.feed,
    });
  }

  return out.slice(0, 4);
}
