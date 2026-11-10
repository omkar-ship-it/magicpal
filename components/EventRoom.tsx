"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Marker, NavigationControl } from "react-map-gl/mapbox";
import Avatar from "./Avatar";
import { IconChat, IconFeed, IconGlobe, IconPeople, IconPin, IconSparkle, IconUser, IconX } from "./Icons";
import {
  ATTENDEES,
  EVENT,
  FEED,
  TIER,
  TOPICS,
  YOU,
  ZONE_LABEL,
  ZONE_ORDER,
  THREADS,
  matchOf,
  matchesFor,
  type Attendee,
  type Line,
  type Match,
  type Tier,
} from "@/lib/eventRoom";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

type Slot = "home" | "forYou" | "feed" | "people" | "now" | "chats" | "you";

/**
 * The live dock's own set, drawn rather than typed.
 *
 * The first pass used text glyphs — ◎ ✦ ☰ — which every platform draws
 * differently and none draws at the weight of the rest of the chrome.
 * These are the same 1.75-stroke icons the real product uses, so a demo
 * sent to an organiser looks like the thing they would be buying.
 */
const SLOTS: Array<{ id: Slot; label: string; icon: React.ReactNode }> = [
  { id: "home", label: "Home", icon: <IconGlobe size={17} /> },
  { id: "forYou", label: "For you", icon: <IconSparkle size={17} /> },
  { id: "feed", label: "Feed", icon: <IconFeed size={17} /> },
  { id: "people", label: "People", icon: <IconPeople size={17} /> },
  { id: "now", label: "Now", icon: <IconPin size={17} /> },
  { id: "chats", label: "Chats", icon: <IconChat size={17} /> },
  { id: "you", label: "You", icon: <IconUser size={17} /> },
];

/**
 * Fifty people in one room, as something an organiser can be sold.
 *
 * Two arrangements, because a venue poses a question a city does not. On
 * a city map distance *is* the information — ten kilometres is a reason
 * not to bother. Inside one building everybody is ninety seconds away,
 * so where somebody stands says almost nothing about whether they are
 * worth your evening. It becomes useful only *after* you have chosen
 * them, when it answers "where are they standing".
 *
 * So the room reads two ways. **In the room** is the venue, honest about
 * where people are. **By match** throws geography out and puts the
 * strongest matches closest to you — the thing a floorplan cannot say
 * and the thing an attendee actually wants to know. The venue is the
 * default because it is the product's own language, but the toggle is
 * where I would point an organiser first.
 *
 * Colour carries the match in both views, so the room is legible before
 * anything is opened: green both ways, amber they can help you, orange
 * you can help them, grey the rest. Grey is not failure — it is the
 * other forty, and a room where everyone is a match has no signal in it.
 */
export default function EventRoom() {
  /**
   * The room leads on a phone; the panel leads on a laptop.
   *
   * A phone has one screen, and giving half of it to a panel squeezed
   * fifty faces down to twenty-two pixels — which is the opposite of
   * what laying them out in rows was for. The dock is one tap away, and
   * For You is the first thing on it.
   */
  const [slot, setSlot] = useState<Slot | null>(() =>
    typeof window !== "undefined" && window.innerWidth >= 640 ? "forYou" : null
  );
  const [view, setView] = useState<"room" | "match">("room");
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [hereOnly, setHereOnly] = useState(false);
  const [chatWith, setChatWith] = useState<Attendee | null>(null);
  /**
   * Seeded, because an empty inbox is the worst thing to show somebody
   * you are trying to persuade. Each one is an hour of the evening
   * compressed down to the step a badge wall never reaches — a time and
   * a place inside the venue.
   */
  const [threads, setThreads] = useState<Record<string, Line[]>>(() =>
    Object.fromEntries(THREADS.map((t) => [t.withId, t.lines]))
  );
  const [unread, setUnread] = useState<Set<string>>(() => new Set(THREADS.filter((t) => t.unread).map((t) => t.withId)));
  const [draft, setDraft] = useState("");
  const [myZone, setMyZone] = useState<string>("hall");
  const [wide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 640);

  /**
   * How much room the header actually takes, measured rather than guessed.
   *
   * It wraps to three rows on a phone and one on a laptop, and grows
   * again by a line the moment a search narrows the room — a constant
   * that clears it in one of those states clips the first zone in the
   * others, which is exactly what it did.
   */
  const head = useRef<HTMLElement | null>(null);
  const [topH, setTopH] = useState(wide ? 62 : 140);
  useEffect(() => {
    const el = head.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTopH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const matches = useMemo(() => matchesFor(), []);
  const tierOf = useMemo(() => new Map(ATTENDEES.map((a) => [a.id, matchOf(a)] as const)), []);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      ATTENDEES.filter((a) => {
        if (hereOnly && a.status !== "checked_in") return false;
        if (!needle) return true;
        return [a.name, a.role, a.company, a.ask, a.offer].join(" ").toLowerCase().includes(needle);
      }),
    [needle, hereOnly]
  );
  const shownIds = useMemo(() => new Set(shown.map((a) => a.id)), [shown]);
  const open = openId ? ATTENDEES.find((a) => a.id === openId) ?? null : null;
  const inRoom = ATTENDEES.filter((a) => a.status === "checked_in").length;

  function say(a: Attendee) {
    setChatWith(a);
    // An existing conversation is resumed, never overwritten with a draft.
    setDraft(threads[a.id]?.length ? "" : tierOf.get(a.id)?.opener ?? "");
    setUnread((u) => {
      const n = new Set(u);
      n.delete(a.id);
      return n;
    });
    setSlot("chats");
    setOpenId(null);
  }
  function send() {
    if (!chatWith || !draft.trim()) return;
    setThreads((t) => ({
      ...t,
      [chatWith.id]: [...(t[chatWith.id] ?? []), { from: "me" as const, text: draft.trim(), ago: "now" }],
    }));
    setDraft("");
  }
  const pick = (id: string) => {
    setHoverId(null);
    setOpenId(id);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "var(--sunk)" }}>
      {view === "room" ? (
        <RoomMap {...{ shownIds, tierOf, hoverId, setHoverId, myZone, wide, topH }} onOpen={pick} />
      ) : (
        <MatchRings {...{ shownIds, tierOf, hoverId, setHoverId }} onOpen={pick} />
      )}

      <header ref={head} className="pointer-events-none absolute inset-x-0 top-0 z-30 p-2.5">
        <div className="pointer-events-auto mx-auto max-w-3xl">
          <div
            className="flex flex-wrap items-center gap-2 rounded-[22px] border px-2.5 py-2 backdrop-blur sm:flex-nowrap sm:rounded-full"
            style={{
              background: "color-mix(in srgb, var(--card) 94%, transparent)",
              borderColor: "var(--line)",
              boxShadow: "0 18px 42px -26px rgba(0,0,0,.55)",
            }}
          >
            <button
              type="button"
              onClick={() => setSlot("home")}
              className="flex min-w-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2"
              style={{ background: "color-mix(in srgb, var(--ink) 8%, transparent)" }}
            >
              <span
                className="grid h-6 w-6 flex-none place-items-center rounded-full text-[11px] text-white"
                style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
              >
                ▦
              </span>
              <span className="min-w-0 truncate text-[12.5px] font-semibold sm:max-w-[150px]">{EVENT.name}</span>
            </button>

            {/* A search box rather than a row of chips. Fifty people is
                past the size where a fixed vocabulary covers what anybody
                is actually hunting for — "payments", "hospital", "ML" are
                all in the asks, and none of them is a filter button. */}
            <div className="relative order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search names, roles, what people are after…"
                aria-label="Search the room"
                className="w-full rounded-full border bg-transparent py-1.5 pl-3 pr-7 text-[12.5px] outline-none"
                style={{ borderColor: "var(--line)" }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px]"
                  style={{ color: "var(--ink-soft)" }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* The one filter worth a permanent control at an event:
                whether somebody is actually in the building changes who
                you walk towards. */}
            <button
              type="button"
              onClick={() => setHereOnly((v) => !v)}
              aria-pressed={hereOnly}
              className="flex-none rounded-full border px-2.5 py-1.5 text-[11.5px] font-semibold"
              style={
                hereOnly
                  ? { background: "var(--good)", borderColor: "var(--good)", color: "#fff" }
                  : { borderColor: "var(--line)", color: "var(--ink)" }
              }
            >
              In the room {inRoom}
            </button>

            <Toggle
              view={view}
              setView={(v) => {
                setView(v);
                // On a phone the panel takes half the screen, and half a
                // screen cannot hold four concentric rings of fifty
                // people. The rings need the room; the panel is one tap
                // away on the dock.
                if (v === "match" && !wide) setSlot(null);
              }}
            />
          </div>

          {(needle || hereOnly) && (
            <p className="mt-1.5 px-2 text-[11.5px] font-semibold" style={{ color: "var(--ink-soft)" }}>
              {shown.length} of {ATTENDEES.length} shown
            </p>
          )}
        </div>
      </header>

      {slot && (
        <Panel title={SLOTS.find((s) => s.id === slot)!.label} onClose={() => setSlot(null)} wide={wide}>
          {slot === "home" && <Home inRoom={inRoom} onPeople={() => setSlot("people")} />}
          {slot === "forYou" && <ForYou matches={matches} onOpen={pick} onSay={say} />}
          {slot === "feed" && <FeedList />}
          {slot === "people" && <People list={shown} tierOf={tierOf} onOpen={pick} />}
          {slot === "now" && <Now myZone={myZone} setMyZone={setMyZone} />}
          {slot === "chats" && (
            <Chats
              who={chatWith}
              threads={threads}
              unread={unread}
              draft={draft}
              setDraft={setDraft}
              onSend={send}
              onPick={say}
              onBack={() => setChatWith(null)}
            />
          )}
          {slot === "you" && <YouPanel myZone={myZone} />}
        </Panel>
      )}

      <Dock
        active={slot}
        onSelect={(s) => setSlot((cur) => (cur === s ? null : s))}
        counts={{ forYou: matches.length, people: shown.length, chats: unread.size }}
      />

      {open && <Profile a={open} m={tierOf.get(open.id)!} onClose={() => setOpenId(null)} onSay={() => say(open)} />}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── the two views */

/**
 * The venue, with the room laid out in rows that fit the screen.
 *
 * Rendered as an overlay rather than as map markers. The rows stopped
 * corresponding to real coordinates the moment they became rows, so
 * pinning them to latitudes bought nothing and cost everything that
 * matters here: a block baked into degrees is a fixed size in metres,
 * which is a different size on every screen and adapts to none of them.
 * As an overlay the room reads the viewport and lays itself out — wider
 * rows on a laptop, narrower on a phone, the same generous spacing on
 * both.
 *
 * The map stays underneath, dimmed. It is no longer claiming that
 * anybody stands on a particular paving stone; it is saying this is a
 * real venue, which is the only thing it was ever really saying.
 */
function RoomMap({
  shownIds,
  tierOf,
  hoverId,
  setHoverId,
  onOpen,
  myZone,
  wide,
  topH,
}: {
  shownIds: Set<string>;
  tierOf: Map<string, Match>;
  hoverId: string | null;
  setHoverId: (v: string | null) => void;
  onOpen: (id: string) => void;
  myZone: string;
  wide: boolean;
  /** Measured height of the header the room has to start below. */
  topH: number;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * Cells sized for a thumb, and as many across as honestly fit.
   *
   * Four on a narrow phone and up to ten on a laptop, from the width
   * that is actually free rather than from a constant somebody picked
   * once. The face grows with the cell, which is what "expand them"
   * means in practice — a 34px avatar in a 46px cell was a room seen
   * through a letterbox.
   */
  const padX = 18;
  const padTop = topH + 8;
  const padBottom = wide ? 92 : 96;
  const right = wide ? 372 : 0;
  const usableW = Math.max(size.w - right - padX * 2, 240);
  const face = wide ? 46 : 40;
  /* A phone pays for air twice — once between faces and again in the
     shrink-to-fit that a taller block forces — so it gets tighter gaps
     and ends up with bigger faces than a generous grid would leave it. */
  const cellX = face + (wide ? 22 : 12);
  const cellY = face + (wide ? 20 : 12);
  const zoneGap = wide ? 26 : 16;
  /**
   * The air a zone label sits in, on top of the gap between zones.
   *
   * Small on purpose. A label needs to clear two faces — the row below
   * it and the row above — but the row above belongs to the previous
   * zone, so `zoneGap` is already paying for most of that. Charging
   * every zone the full clearance was five times the bill for one
   * zone's problem, and it cost a phone a third of its face size.
   */
  const labelRoom = wide ? 20 : 14;
  const cols = Math.max(3, Math.min(10, Math.floor(usableW / cellX)));

  /* You occupy a seat like everybody else rather than floating below
     the zone: parked in the gap, your marker landed squarely on the
     next zone's label, and a room that seats fifty and leaves you
     hovering outside it is making the wrong point anyway. */
  const seats = (z: { id: string; size: number }) => z.size + (z.id === myZone ? 1 : 0);
  const blocks = ZONE_ORDER.map((z) => ({ ...z, rows: Math.ceil(seats(z) / cols) }));
  const totalH = blocks.reduce((s, z) => s + z.rows * cellY, 0) + (blocks.length - 1) * zoneGap + labelRoom * blocks.length;
  const availH = Math.max(size.h - padTop - padBottom, 260);
  /** Shrink to fit rather than overflow — a room you cannot see is worse
   *  than a room drawn slightly small. */
  const k = Math.min(1, availH / totalH);

  /** What the top zone's label needs beyond its own band, since it is
   *  the one label with no row above it to sit between. */
  const headroom = Math.max(0, (face / 2 + 16 - labelRoom) * k + 9);
  const originY = padTop + headroom + Math.max(0, (availH - headroom - totalH * k) / 2);
  const centreX = padX + usableW / 2;

  const place = new Map<string, { x: number; y: number }>();
  let mine: { x: number; y: number } | null = null;
  let y = originY;
  for (const z of blocks) {
    y += labelRoom * k;
    const n = seats(z);
    const at = (seat: number) => {
      const row = Math.floor(seat / cols);
      const widthOfRow = Math.min(cols, n - row * cols);
      return {
        x: centreX + ((seat % cols) - (widthOfRow - 1) / 2) * cellX * k,
        y: y + row * cellY * k,
      };
    };
    for (const a of ATTENDEES) if (a.zone === z.id) place.set(a.id, at(a.seat));
    if (z.id === myZone) mine = at(z.size);
    y += z.rows * cellY * k + zoneGap * k;
  }

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden">
      <MapGL
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={{ latitude: EVENT.lat, longitude: EVENT.lng, zoom: 16.4 }}
        minZoom={15}
        maxZoom={18}
        style={{ position: "absolute", inset: 0 }}
        reuseMaps
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "color-mix(in srgb, var(--sunk) 52%, transparent)" }}
      />

      {blocks.map((z, zi) => {
        const first = ATTENDEES.find((a) => a.zone === z.id);
        const p = first ? place.get(first.id) : null;
        if (!p) return null;
        const here = ATTENDEES.filter((a) => a.zone === z.id && a.status === "checked_in").length;
        return (
          <span
            key={z.id}
            data-zone-label={z.id}
            className="pointer-events-none absolute whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] backdrop-blur"
            style={{
              left: centreX,
              // Above its own first row, never on it.
              top: p.y - (face / 2 + 16) * k,
              transform: "translate(-50%,-50%)",
              background: "color-mix(in srgb, var(--card) 84%, transparent)",
              color: "color-mix(in srgb, var(--ink) 52%, transparent)",
              zIndex: 4 + zi,
            }}
          >
            {z.label} · {here}
          </span>
        );
      })}

      {ATTENDEES.map((a) => {
        const p = place.get(a.id);
        if (!p) return null;
        const m = tierOf.get(a.id)!;
        const dim = !shownIds.has(a.id);
        return (
          <span
            key={a.id}
            className="absolute"
            style={{
              left: p.x,
              top: p.y,
              transform: "translate(-50%,-50%)",
              zIndex: hoverId === a.id ? 60 : m.tier === "mutual" ? 3 : 2,
            }}
          >
            <Pin
              a={a}
              m={m}
              size={Math.round(face * k)}
              dim={dim}
              hovered={hoverId === a.id}
              onEnter={() => !dim && setHoverId(a.id)}
              onLeave={() => setHoverId(null)}
              onClick={() => !dim && onOpen(a.id)}
            />
          </span>
        );
      })}

      {/* You, in the last seat of whichever zone the Now panel says you are. */}
      {mine && (
        <span className="absolute" style={{ left: mine.x, top: mine.y, transform: "translate(-50%,-50%)", zIndex: 70 }}>
          <YouPin size={Math.round(face * k)} />
        </span>
      )}
    </div>
  );
}

/**
 * The same fifty, arranged by what they are worth to you.
 *
 * Distance from the centre is the match and nothing else: mutual on the
 * inner ring, then people who can help you, then people you could help,
 * then everybody else out at the edge. It is the one layout that answers
 * the question an attendee has, and it is the one a floorplan cannot
 * draw — which is the whole argument for having both.
 */
function MatchRings({
  shownIds,
  tierOf,
  hoverId,
  setHoverId,
  onOpen,
}: {
  shownIds: Set<string>;
  tierOf: Map<string, Match>;
  hoverId: string | null;
  setHoverId: (v: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rings: Tier[] = ["mutual", "they-help", "you-help", "none"];
  /**
   * Centred on what is visible, not on the canvas.
   *
   * The header and the panel cover the top and one side, and a ring
   * centred on the viewport puts a third of the outer band underneath
   * them — on the one view whose whole point is that position carries
   * meaning, which makes the hidden people look like a shorter list
   * rather than a further ring.
   */
  const pad = { top: 104, bottom: 96, left: 14, right: size.w >= 640 ? 372 : 14 };
  const cx = pad.left + (size.w - pad.left - pad.right) / 2;
  const cy = pad.top + (size.h - pad.top - pad.bottom) / 2;
  /** Less the avatar's own radius, or the outer ring is clipped by half a face. */
  const unit = Math.max(Math.min(size.w - pad.left - pad.right, size.h - pad.top - pad.bottom) / 2 - 58, 96);

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" style={{ background: "var(--sunk)" }}>
      {TOPICS.map((t, ti) => {
        const ang = ti * ((Math.PI * 2) / TOPICS.length) - Math.PI / 2;
        const r = unit * 1.1;
        return (
          <span
            key={`spoke-${t.id}`}
            className="pointer-events-none absolute origin-left"
            style={{
              left: cx,
              top: cy,
              width: r,
              height: 1,
              transform: `rotate(${ang}rad)`,
              background: "color-mix(in srgb, var(--ink) 7%, transparent)",
            }}
          />
        );
      })}

      {rings.map((t, i) => {
        const r = unit * (0.27 + i * 0.235) + unit * 0.055;
        return (
          <span
            key={t}
            className="pointer-events-none absolute rounded-full border"
            style={{
              left: cx - r,
              top: cy - r,
              width: r * 2,
              height: r * 2,
              borderColor: `color-mix(in srgb, ${TIER[t].colour} 24%, transparent)`,
              borderStyle: t === "none" ? "dashed" : "solid",
            }}
          />
        );
      })}

      {/* Sector labels, so the angle reads as a subject rather than as
          decoration. They also answer the organiser's question in one
          glance: this room is fourteen people short of funding and nine
          who can give it. */}
      {TOPICS.map((t, ti) => {
        const n = ATTENDEES.filter((a) => a.askTopic === t.id).length;
        const mid = (ti + 0.5) * ((Math.PI * 2) / TOPICS.length) - Math.PI / 2;
        const r = unit * 1.21;
        return (
          <span
            key={t.id}
            className="pointer-events-none absolute whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] backdrop-blur"
            style={{
              left: cx + Math.cos(mid) * r,
              top: cy + Math.sin(mid) * r,
              transform: "translate(-50%,-50%)",
              background: "color-mix(in srgb, var(--card) 80%, transparent)",
              color: "color-mix(in srgb, var(--ink) 46%, transparent)",
            }}
          >
            {t.label} · {n}
          </span>
        );
      })}

      {rings.flatMap((t, ri) => {
        const band = ATTENDEES.filter((a) => tierOf.get(a.id)!.tier === t);
        const base = unit * (0.27 + ri * 0.235);
        /**
         * Angle is what they are looking for; radius is what they are
         * worth to you. Both coordinates carry something, which the
         * first pass did not — people were spread evenly around each
         * ring, so forty-nine of fifty positions meant nothing and the
         * picture spent most of its pixels saying one number.
         *
         * Grouped by ask rather than offer because that is how a room
         * is described — "half of them are raising" — and because it is
         * the question an organiser asks about their own event.
         */
        const perTopic = (Math.PI * 2) / TOPICS.length;
        const seen = new Map<string, number>();
        const inBandByTopic = new Map<string, number>();
        for (const x of band) inBandByTopic.set(x.askTopic, (inBandByTopic.get(x.askTopic) ?? 0) + 1);
        return band.map((a) => {
          const ti = TOPICS.findIndex((x) => x.id === a.askTopic);
          const k = seen.get(a.askTopic) ?? 0;
          seen.set(a.askTopic, k + 1);
          const count = inBandByTopic.get(a.askTopic) ?? 1;
          // Fanned inside the sector, never on its seam, so neighbouring
          // subjects stay visually separate.
          const frac = (k + 1) / (count + 1);
          const angle = ti * perTopic + frac * perTopic * 0.78 + perTopic * 0.11 - Math.PI / 2;
          /**
           * A band, not a line. Nine people who share a tier and a
           * subject were landing on one arc at identical radius and
           * overlapping into a smear — the stagger gives each ring
           * thickness so a cluster reads as a cluster of faces rather
           * than as one wide blob.
           */
          const r = base + (k % 3) * unit * 0.055;
          const m = tierOf.get(a.id)!;
          const dim = !shownIds.has(a.id);
          return (
            <span
              key={a.id}
              className="absolute"
              style={{
                left: cx + Math.cos(angle) * r,
                top: cy + Math.sin(angle) * r,
                transform: "translate(-50%, -50%)",
                zIndex: hoverId === a.id ? 60 : 2,
              }}
            >
              <Pin
                a={a}
                m={m}
                dim={dim}
                hovered={hoverId === a.id}
                onEnter={() => !dim && setHoverId(a.id)}
                onLeave={() => setHoverId(null)}
                onClick={() => !dim && onOpen(a.id)}
              />
            </span>
          );
        });
      })}

      <span className="absolute" style={{ left: cx, top: cy, transform: "translate(-50%,-50%)", zIndex: 70 }}>
        <YouPin />
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── pieces */

function Pin({
  a,
  m,
  size = 34,
  dim,
  hovered,
  onEnter,
  onLeave,
  onClick,
}: {
  a: Attendee;
  m: Match;
  /** The room sizes its own faces; the rings keep the default. */
  size?: number;
  dim: boolean;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const c = TIER[m.tier].colour;
  return (
    <span
      data-pin={a.id}
      className="relative block"
      style={{ opacity: dim ? 0.14 : a.status === "no_show" ? 0.4 : 1, transition: "opacity 180ms ease" }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`${a.name} — ${TIER[m.tier].label}`}
        className="block rounded-full"
        style={{
          borderRadius: 999,
          /* Checked in wears a solid ring in its tier colour; a promise to
             come wears a dotted one. The difference has to survive being
             read at thumbnail size across a whole map, which a badge in
             the corner does not. */
          boxShadow:
            a.status === "checked_in"
              ? `0 0 0 3px ${c}, 0 6px 18px -8px rgba(0,0,0,.45)`
              : "0 0 0 2px var(--card), 0 6px 16px -10px rgba(0,0,0,.4)",
          outline: a.status !== "checked_in" ? `2px dashed color-mix(in srgb, ${c} 60%, transparent)` : undefined,
          outlineOffset: a.status !== "checked_in" ? 2 : undefined,
        }}
      >
        <Avatar name={a.name} size={size} />
      </button>
      {hovered && <Hover a={a} m={m} />}
    </span>
  );
}

function YouPin({ size = 40 }: { size?: number }) {
  return (
    <span
      data-you=""
      className="grid place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, Math.round(size * 0.27)),
        background: "var(--brand)",
        boxShadow: "0 0 0 3px var(--card), 0 10px 24px -10px rgba(0,0,0,.55)",
      }}
    >
      You
    </span>
  );
}

function Hover({ a, m }: { a: Attendee; m: Match }) {
  return (
    <span
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 block w-[246px] -translate-x-1/2 rounded-2xl border p-2.5 text-left"
      style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "0 22px 48px -22px rgba(0,0,0,.6)" }}
    >
      <span className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{a.name}</span>
        <Status a={a} />
      </span>
      <span className="block truncate text-[11px]" style={{ color: "var(--ink-soft)" }}>
        {a.role} · {a.company}
      </span>
      <TierBadge m={m} />
      <Ask side="ask" text={a.ask} />
      <Ask side="offer" text={a.offer} />
    </span>
  );
}

function TierBadge({ m }: { m: Match }) {
  if (m.tier === "none") return null;
  return (
    <span
      className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]"
      style={{ background: `color-mix(in srgb, ${TIER[m.tier].colour} 16%, transparent)`, color: TIER[m.tier].colour }}
    >
      {TIER[m.tier].label}
    </span>
  );
}

const STATUS = {
  checked_in: { c: "var(--good)", t: "In the room" },
  going: { c: "var(--ink-soft)", t: "On the way" },
  no_show: { c: "var(--line)", t: "Not here" },
} as const;

function Status({ a }: { a: Attendee }) {
  const s = STATUS[a.status];
  return (
    <span className="flex flex-none items-center gap-1 text-[9.5px] font-bold" style={{ color: s.c }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.c }} />
      {s.t}
    </span>
  );
}

function Ask({ side, text }: { side: "ask" | "offer"; text: string }) {
  const c = side === "ask" ? "var(--brand)" : "var(--good)";
  return (
    <span className="mt-1.5 block rounded-xl px-2 py-1.5" style={{ background: `color-mix(in srgb, ${c} 10%, transparent)` }}>
      <span className="block text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: c }}>
        {side === "ask" ? "Looking for" : "Can help with"}
      </span>
      <span className="block text-[11.5px] font-semibold leading-[1.3]">{text}</span>
    </span>
  );
}

function Toggle({ view, setView }: { view: "room" | "match"; setView: (v: "room" | "match") => void }) {
  return (
    <span className="flex flex-none rounded-full p-0.5" style={{ background: "color-mix(in srgb, var(--ink) 8%, transparent)" }}>
      {(["room", "match"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={view === v ? { background: "var(--card)", boxShadow: "0 2px 8px -4px rgba(0,0,0,.4)" } : { color: "var(--ink-soft)" }}
        >
          {v === "room" ? "In the room" : "By match"}
        </button>
      ))}
    </span>
  );
}

function Panel({ title, onClose, wide, children }: { title: string; onClose: () => void; wide: boolean; children: React.ReactNode }) {
  return (
    <aside className="pointer-events-none absolute inset-x-0 bottom-[84px] z-20 px-2.5 sm:inset-x-auto sm:bottom-[92px] sm:right-3 sm:w-[352px] sm:px-0">
      <div
        className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border backdrop-blur"
        style={{
          maxHeight: wide ? "64dvh" : "38dvh",
          background: "color-mix(in srgb, var(--card) 95%, transparent)",
          borderColor: "var(--line)",
          boxShadow: "0 26px 60px -30px rgba(0,0,0,.65)",
        }}
      >
        <div className="flex flex-none items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--line)" }}>
          <p className="text-[12.5px] font-bold">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">{children}</div>
      </div>
    </aside>
  );
}

function Dock({
  active,
  onSelect,
  counts,
}: {
  active: Slot | null;
  onSelect: (s: Slot) => void;
  /** Shown beside the label, as the live dock does. Zero renders nothing. */
  counts: Partial<Record<Slot, number>>;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-1 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-2">
      <div
        className="pointer-events-auto flex max-w-full items-center gap-0 overflow-x-auto rounded-[24px] border p-1.5 backdrop-blur sm:gap-0.5"
        style={{
          background: "color-mix(in srgb, var(--card) 94%, transparent)",
          borderColor: "var(--line)",
          boxShadow: "0 22px 50px -26px rgba(0,0,0,.6)",
        }}
      >
        {SLOTS.map((s) => {
          const on = active === s.id;
          const n = counts[s.id];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={on}
              className="flex w-[46px] flex-none flex-col items-center justify-center gap-1 rounded-2xl py-1.5 sm:w-[60px]"
              style={on ? { background: "color-mix(in srgb, var(--brand) 13%, transparent)" } : undefined}
            >
              {/* "You" wears the visitor's own face rather than an icon,
                  same as the live dock — it is the one slot that is a
                  person instead of a place. */}
              <span className="relative" style={{ color: on ? "var(--brand)" : "var(--ink-soft)" }}>
                {s.id === "you" ? <Avatar name="You" size={19} /> : s.icon}
              </span>
              <span
                className="whitespace-nowrap text-[9px] font-semibold sm:text-[10.5px]"
                style={{ color: on ? "var(--brand)" : "var(--ink)" }}
              >
                {s.label}
                {n != null && n > 0 && (
                  <span style={{ color: on ? "var(--brand)" : "var(--ink-soft)" }}> {n}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── panels */

function Home({ inRoom, onPeople }: { inRoom: number; onPeople: () => void }) {
  const coming = ATTENDEES.filter((a) => a.status === "going").length;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
        <p className="text-[15px] font-bold leading-tight">{EVENT.name}</p>
        <p className="mt-0.5 text-[12px]" style={{ color: "var(--ink-soft)" }}>
          {EVENT.room} · {EVENT.venue}
        </p>
        <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>
          {EVENT.when} · hosted by {EVENT.host}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat n={inRoom} label="in the room" tone="var(--good)" />
        <Stat n={coming} label="on the way" />
        <Stat n={ATTENDEES.length} label="registered" />
      </div>
      <p className="text-[12px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
        Check-in opens fifteen minutes before the doors and closes when the event ends, so
        &ldquo;in the room&rdquo; always means now rather than a promise made last week.
      </p>
      <button type="button" onClick={onPeople} className="rounded-full py-2 text-[12.5px] font-semibold text-white" style={{ background: "var(--brand)" }}>
        See everyone
      </button>
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <div className="rounded-xl p-2 text-center" style={{ background: "var(--sunk)" }}>
      <p className="text-[18px] font-bold leading-none" style={{ color: tone ?? "var(--ink)" }}>
        {n}
      </p>
      <p className="mt-1 text-[10px]" style={{ color: "var(--ink-soft)" }}>
        {label}
      </p>
    </div>
  );
}

function ForYou({ matches, onOpen, onSay }: { matches: Match[]; onOpen: (id: string) => void; onSay: (a: Attendee) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {matches.map((m) => (
        <li key={m.a.id} className="rounded-2xl border p-2.5" style={{ borderColor: "var(--line)" }}>
          <button type="button" onClick={() => onOpen(m.a.id)} className="flex w-full items-center gap-2 text-left">
            <span className="flex-none rounded-full" style={{ boxShadow: `0 0 0 2.5px ${TIER[m.tier].colour}`, borderRadius: 999 }}>
              <Avatar name={m.a.name} size={30} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold">{m.a.name}</span>
              <span className="block truncate text-[11px]" style={{ color: "var(--ink-soft)" }}>
                {m.a.role} · {m.a.company}
              </span>
            </span>
            <Status a={m.a} />
          </button>
          <TierBadge m={m} />
          <p className="mt-1 text-[11.5px] leading-[1.45]" style={{ color: "var(--ink-soft)" }}>
            {m.reason}
          </p>
          {/* The draft, shown before the tap. The step people stall on is
              the first sentence, not the decision — a matcher that stops
              at a name has done about half the job. */}
          <p className="mt-1.5 rounded-xl p-2 text-[11.5px] italic leading-[1.4]" style={{ background: "var(--sunk)" }}>
            “{m.opener}”
          </p>
          <button type="button" onClick={() => onSay(m.a)} className="mt-2 w-full rounded-full py-1.5 text-[12px] font-semibold text-white" style={{ background: "var(--brand)" }}>
            Edit and send
          </button>
        </li>
      ))}
    </ul>
  );
}

function People({ list, tierOf, onOpen }: { list: Attendee[]; tierOf: Map<string, Match>; onOpen: (id: string) => void }) {
  if (!list.length)
    return (
      <p className="p-2 text-[12px]" style={{ color: "var(--ink-soft)" }}>
        Nobody matches that search.
      </p>
    );
  return (
    <ul className="flex flex-col gap-1">
      {list.map((a) => {
        const m = tierOf.get(a.id)!;
        return (
          <li key={a.id}>
            <button type="button" onClick={() => onOpen(a.id)} className="flex w-full items-start gap-2 rounded-xl p-1.5 text-left">
              <span className="flex-none rounded-full" style={{ boxShadow: `0 0 0 2px ${TIER[m.tier].colour}`, borderRadius: 999 }}>
                <Avatar name={a.name} size={28} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="min-w-0 truncate text-[12px] font-bold">{a.name}</span>
                  <Status a={a} />
                </span>
                <span className="block truncate text-[10.5px]" style={{ color: "var(--ink-soft)" }}>
                  {a.role} · {a.company}
                </span>
                <span className="block truncate text-[10.5px]" style={{ color: "var(--brand)" }}>
                  Looking for {a.ask}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function FeedList() {
  return (
    <ul className="flex flex-col gap-2.5">
      {FEED.map((p) => (
        <li key={p.id} className="flex gap-2">
          <Avatar name={p.who.name} size={26} />
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px]">
              <strong className="font-bold">{p.who.name}</strong>
              <span style={{ color: "var(--ink-soft)" }}> · {p.ago} ago</span>
            </span>
            <span className="mt-0.5 block text-[12px] leading-[1.45]">{p.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Now({ myZone, setMyZone }: { myZone: string; setMyZone: (z: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
        Drop yourself somewhere in the venue so the people who want you can find you. It lasts the
        evening and leaves nothing on your profile.
      </p>
      {Object.entries(ZONE_LABEL).map(([id, label]) => {
        const n = ATTENDEES.filter((a) => a.zone === id && a.status === "checked_in").length;
        const on = myZone === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setMyZone(id)}
            aria-pressed={on}
            className="flex items-center justify-between rounded-xl border px-3 py-2 text-left"
            style={on ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 9%, transparent)" } : { borderColor: "var(--line)" }}
          >
            <span className="text-[12.5px] font-semibold">{label}</span>
            <span className="text-[11px] font-semibold" style={{ color: on ? "var(--brand)" : "var(--ink-soft)" }}>
              {on ? "You're here" : `${n} here`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function YouPanel({ myZone }: { myZone: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <YouPin />
        <span className="min-w-0">
          <span className="block text-[13px] font-bold">{YOU.name}</span>
          <span className="block text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
            {YOU.role} · in the room · {ZONE_LABEL[myZone]}
          </span>
        </span>
      </div>
      <Ask side="ask" text={YOU.ask} />
      <Ask side="offer" text={YOU.offer} />
      <p className="text-[11.5px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
        These two lines are what the room matches on. Everything else is introduction; this is the
        part that gets you found.
      </p>
    </div>
  );
}

/**
 * The inbox, then one conversation — a list first, because the question
 * on opening Chats is "who is waiting on me", not "what did I say to
 * Vikram".
 */
function Chats({
  who,
  threads,
  unread,
  draft,
  setDraft,
  onSend,
  onPick,
  onBack,
}: {
  who: Attendee | null;
  threads: Record<string, Line[]>;
  unread: Set<string>;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  onPick: (a: Attendee) => void;
  onBack: () => void;
}) {
  if (!who) {
    const ids = Object.keys(threads);
    if (!ids.length)
      return (
        <p className="p-2 text-[12px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
          Pick somebody from <strong>For you</strong> and the opening line is written for you.
        </p>
      );
    return (
      <ul className="flex flex-col gap-0.5">
        {ids.map((id) => {
          const a = ATTENDEES.find((x) => x.id === id);
          if (!a) return null;
          const lines = threads[id];
          const last = lines[lines.length - 1];
          return (
            <li key={id}>
              <button type="button" onClick={() => onPick(a)} className="flex w-full items-start gap-2 rounded-xl p-1.5 text-left">
                <Avatar name={a.name} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{a.name}</span>
                    <span className="flex-none text-[10px]" style={{ color: "var(--ink-soft)" }}>
                      {last.ago}
                    </span>
                    {unread.has(id) && <span className="h-2 w-2 flex-none rounded-full" style={{ background: "var(--brand)" }} />}
                  </span>
                  <span className="block truncate text-[11px]" style={{ color: "var(--ink-soft)" }}>
                    {last.from === "me" ? "You: " : ""}
                    {last.text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const lines = threads[who.id] ?? [];
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-2 pb-2">
        <button type="button" onClick={onBack} aria-label="All chats" className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
          ‹
        </button>
        <Avatar name={who.name} size={26} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-bold">{who.name}</span>
          <span className="block truncate text-[10.5px]" style={{ color: "var(--ink-soft)" }}>
            {who.status === "checked_in" ? `In the room · ${ZONE_LABEL[who.zone]}` : "Not in the room yet"}
          </span>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 && (
          <p className="text-[11.5px] italic" style={{ color: "var(--ink-soft)" }}>
            Draft below — edit it or send as it is.
          </p>
        )}
        {lines.map((l, i) => (
          <p
            key={i}
            className={`mb-1.5 max-w-[85%] rounded-2xl p-2 text-[12px] leading-[1.45] ${
              l.from === "me" ? "ml-auto rounded-br-sm text-white" : "rounded-bl-sm"
            }`}
            style={l.from === "me" ? { background: "var(--brand)" } : { background: "var(--sunk)" }}
          >
            {l.text}
          </p>
        ))}
      </div>
      <form
        className="mt-2 flex flex-none items-end gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={draft.length > 70 ? 3 : 1}
          placeholder={`Reply to ${who.name.split(" ")[0]}…`}
          aria-label="Your message"
          className="min-w-0 flex-1 resize-none rounded-2xl border bg-transparent px-3 py-2 text-[12px] leading-[1.4] outline-none"
          style={{ borderColor: "var(--line)" }}
        />
        <button type="submit" className="flex-none rounded-full px-3 py-2 text-[12px] font-semibold text-white" style={{ background: "var(--brand)" }}>
          Send
        </button>
      </form>
    </div>
  );
}

function Profile({ a, m, onClose, onSay }: { a: Attendee; m: Match; onClose: () => void; onSay: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--sunk) 58%, transparent)" }} />
      <div
        className="relative w-full max-w-[360px] rounded-3xl border p-4"
        style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "0 30px 70px -30px rgba(0,0,0,.65)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="flex-none rounded-full" style={{ boxShadow: `0 0 0 3px ${TIER[m.tier].colour}`, borderRadius: 999 }}>
            <Avatar name={a.name} size={48} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-bold leading-tight">{a.name}</p>
            <p className="truncate text-[12px]" style={{ color: "var(--ink-soft)" }}>
              {a.role} · {a.company}
            </p>
            <span className="mt-0.5 block">
              <Status a={a} />
            </span>
          </div>
        </div>
        <TierBadge m={m} />
        <p className="mt-2 text-[12.5px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
          {a.bio}
        </p>
        <Ask side="ask" text={a.ask} />
        <Ask side="offer" text={a.offer} />
        <button type="button" onClick={onSay} className="mt-3 w-full rounded-full py-2 text-[13px] font-semibold text-white" style={{ background: "var(--brand)" }}>
          {m.tier === "none" ? "Say hello" : "Open with a draft"}
        </button>
      </div>
    </div>
  );
}
