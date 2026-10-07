"use client";

import { avatarUrl } from "@/lib/avatar";
import { cityById, memberById, type CircleEvent, type TravelPing } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";

export type DigestLine = {
  id: string;
  emoji: string;
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
  pings,
  events,
  newPostCount,
  onCity,
  onPing,
  onEvent,
  onFeed,
  onDismiss,
}: {
  me: CircleMe;
  pings: TravelPing[];
  events: CircleEvent[];
  newPostCount: number;
  onCity: (id: string) => void;
  onPing: (p: TravelPing) => void;
  onEvent: (id: string) => void;
  onFeed: () => void;
  onDismiss: () => void;
}) {
  const lines = buildDigest(me, pings, events, newPostCount, { city: onCity, ping: onPing, event: onEvent, feed: onFeed });
  if (lines.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-[88px] left-3 z-[1200] w-[min(330px,calc(100vw-24px))] sm:bottom-24 sm:left-5">
      <div
        className="pointer-events-auto rounded-3xl border border-[var(--line)] p-3"
        style={{ background: "color-mix(in srgb, var(--card) 95%, transparent)", backdropFilter: "blur(14px)", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="flex items-center gap-2 px-1 pb-1.5">
          <span className="text-[12px] font-semibold">This week in your world</span>
          <button onClick={onDismiss} className="win-btn ml-auto flex-none" title="Dismiss">
            ×
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {lines.map((l) => (
            <button key={l.id} onClick={l.onClick} className="flex w-full items-start gap-2.5 rounded-2xl p-2 text-left transition-colors hover:bg-[var(--sunk)]">
              <span className="mt-0.5 flex-none text-[15px] leading-none">{l.emoji}</span>
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

/**
 * The lines themselves, ranked by how much they'd actually make someone act.
 * Somebody landing in your city this week beats a milestone post, every time.
 */
function buildDigest(
  me: CircleMe,
  pings: TravelPing[],
  events: CircleEvent[],
  newPostCount: number,
  go: { city: (id: string) => void; ping: (p: TravelPing) => void; event: (id: string) => void; feed: () => void }
): DigestLine[] {
  const out: DigestLine[] = [];

  const toMyCity = pings.filter((p) => p.cityId === me.cityId && p.daysAway <= 7);
  if (toMyCity.length > 0) {
    const names = toMyCity.map((p) => memberById(p.memberId)?.name ?? "").filter(Boolean);
    out.push({
      id: "incoming",
      emoji: "✈️",
      headline: `${toMyCity.length} ${toMyCity.length === 1 ? "person is" : "people are"} in ${cityById(me.cityId)?.name} this week`,
      detail: names.slice(0, 2).join(", ") + (names.length > 2 ? ` and ${names.length - 2} more` : ""),
      faces: names,
      onClick: () => go.ping(toMyCity[0]),
    });
  }

  const live = events.find((e) => e.liveNow);
  if (live) {
    out.push({
      id: "live",
      emoji: "🔴",
      headline: `${live.name} is happening now`,
      detail: live.venue ? `${live.venue} — beacon on to be found` : "Online — join from anywhere",
      onClick: () => go.event(live.id),
    });
  }

  const nearby = events.filter((e) => e.cityId === me.cityId && !e.liveNow && e.daysAway <= 14);
  if (nearby.length > 0) {
    out.push({
      id: "nearby",
      emoji: "📍",
      headline: `${nearby.length} meetup${nearby.length === 1 ? "" : "s"} in your city`,
      detail: `${nearby[0].name} · ${nearby[0].dateLabel}`,
      onClick: () => go.event(nearby[0].id),
    });
  }

  const soon = pings.filter((p) => p.daysAway > 0 && p.daysAway <= 10 && p.cityId !== me.cityId);
  if (soon.length > 0) {
    const cities = new Set(soon.map((p) => p.cityId));
    out.push({
      id: "moving",
      emoji: "🌍",
      headline: `${soon.length} travelling across ${cities.size} ${cities.size === 1 ? "city" : "cities"}`,
      detail: "Worth a look before you book your own trip",
      onClick: go.feed,
    });
  }

  if (newPostCount > 0) {
    out.push({
      id: "posts",
      emoji: "💬",
      headline: `${newPostCount} new in the feed`,
      detail: "Asks, hiring and a few milestones",
      onClick: go.feed,
    });
  }

  return out.slice(0, 4);
}
