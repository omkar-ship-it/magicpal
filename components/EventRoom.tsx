"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Marker, NavigationControl } from "react-map-gl/mapbox";
import Avatar from "./Avatar";
import {
  ATTENDEES,
  EVENT,
  FEED,
  TIER,
  YOU,
  ZONE_LABEL,
  matchOf,
  matchesFor,
  type Attendee,
  type Match,
  type Tier,
} from "@/lib/eventRoom";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

type Slot = "home" | "forYou" | "feed" | "people" | "now" | "chats" | "you";

const SLOTS: Array<{ id: Slot; label: string; icon: string }> = [
  { id: "home", label: "Home", icon: "◎" },
  { id: "forYou", label: "For you", icon: "✦" },
  { id: "feed", label: "Feed", icon: "☰" },
  { id: "people", label: "People", icon: "⚇" },
  { id: "now", label: "Now", icon: "⌖" },
  { id: "chats", label: "Chats", icon: "✉" },
  { id: "you", label: "You", icon: "●" },
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
  const [slot, setSlot] = useState<Slot | null>("forYou");
  const [view, setView] = useState<"room" | "match">("room");
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [hereOnly, setHereOnly] = useState(false);
  const [chatWith, setChatWith] = useState<Attendee | null>(null);
  const [threads, setThreads] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState("");
  const [myZone, setMyZone] = useState<string>("hall");
  const [wide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 640);

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
    setDraft(tierOf.get(a.id)?.opener ?? "");
    setSlot("chats");
    setOpenId(null);
  }
  function send() {
    if (!chatWith || !draft.trim()) return;
    setThreads((t) => ({ ...t, [chatWith.id]: [...(t[chatWith.id] ?? []), draft.trim()] }));
    setDraft("");
  }
  const pick = (id: string) => {
    setHoverId(null);
    setOpenId(id);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "var(--sunk)" }}>
      {view === "room" ? (
        <RoomMap {...{ shownIds, tierOf, hoverId, setHoverId, myZone, wide }} onOpen={pick} />
      ) : (
        <MatchRings {...{ shownIds, tierOf, hoverId, setHoverId }} onOpen={pick} />
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 p-2.5">
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
            <Chat who={chatWith} sent={chatWith ? threads[chatWith.id] ?? [] : []} draft={draft} setDraft={setDraft} onSend={send} />
          )}
          {slot === "you" && <YouPanel myZone={myZone} />}
        </Panel>
      )}

      <Dock active={slot} onSelect={(s) => setSlot((cur) => (cur === s ? null : s))} waiting={Object.keys(threads).length} />

      {open && <Profile a={open} m={tierOf.get(open.id)!} onClose={() => setOpenId(null)} onSay={() => say(open)} />}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── the two views */

function RoomMap({
  shownIds,
  tierOf,
  hoverId,
  setHoverId,
  onOpen,
  myZone,
  wide,
}: {
  shownIds: Set<string>;
  tierOf: Map<string, Match>;
  hoverId: string | null;
  setHoverId: (v: string | null) => void;
  onOpen: (id: string) => void;
  myZone: string;
  wide: boolean;
}) {
  const mine = ATTENDEES.filter((a) => a.zone === myZone);
  const youLat = mine.length ? mine.reduce((s, a) => s + a.lat, 0) / mine.length : EVENT.lat;
  const youLng = mine.length ? mine.reduce((s, a) => s + a.lng, 0) / mine.length : EVENT.lng;

  return (
    <MapGL
      mapboxAccessToken={MAPBOX_TOKEN}
      mapStyle={MAP_STYLE}
      /* Framed around the chrome, not the viewport: the header and the
         panel cover a third of the screen, and Mapbox centres on the
         canvas — so without padding a fifth of the room hides behind
         them, on a page whose whole argument is how many people there are. */
      initialViewState={{
        latitude: EVENT.lat,
        longitude: EVENT.lng,
        zoom: 17.35,
        padding: { top: 132, right: wide ? 372 : 16, bottom: wide ? 110 : 360, left: 16 },
      }}
      minZoom={16.5}
      maxZoom={20}
      style={{ position: "absolute", inset: 0 }}
      reuseMaps
    >
      <NavigationControl position="top-right" showCompass={false} />

      {ATTENDEES.map((a) => {
        const m = tierOf.get(a.id)!;
        const dim = !shownIds.has(a.id);
        return (
          <Marker
            key={a.id}
            latitude={a.lat}
            longitude={a.lng}
            anchor="center"
            /* Markers are siblings in source order, so without this the
               hover card opens underneath whoever is drawn later — which
               in a crowd is most of them. */
            style={{ zIndex: hoverId === a.id ? 60 : m.tier === "mutual" ? 3 : m.tier === "none" ? 1 : 2 }}
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
          </Marker>
        );
      })}

      {Object.entries(ZONE_LABEL).map(([id, label]) => {
        const inZone = ATTENDEES.filter((a) => a.zone === id);
        if (!inZone.length) return null;
        const lng = inZone.reduce((s, a) => s + a.lng, 0) / inZone.length;
        const top = Math.max(...inZone.map((a) => a.lat));
        return (
          <Marker key={id} latitude={top} longitude={lng} anchor="bottom">
            <span
              className="pointer-events-none mb-2 block whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] backdrop-blur"
              style={{
                background: "color-mix(in srgb, var(--card) 76%, transparent)",
                color: "color-mix(in srgb, var(--ink) 50%, transparent)",
              }}
            >
              {label} · {inZone.filter((a) => a.status === "checked_in").length}
            </span>
          </Marker>
        );
      })}

      <Marker latitude={youLat} longitude={youLng} anchor="center" style={{ zIndex: 70 }}>
        <YouPin />
      </Marker>
    </MapGL>
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
  const unit = Math.max(Math.min(size.w - pad.left - pad.right, size.h - pad.top - pad.bottom) / 2 - 22, 110);

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" style={{ background: "var(--sunk)" }}>
      {rings.map((t, i) => {
        const r = unit * (0.3 + i * 0.233);
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

      {rings.flatMap((t, ri) => {
        const band = ATTENDEES.filter((a) => tierOf.get(a.id)!.tier === t);
        const r = unit * (0.3 + ri * 0.233);
        return band.map((a, k) => {
          const angle = (k / Math.max(band.length, 1)) * Math.PI * 2 + ri * 0.6;
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
  dim,
  hovered,
  onEnter,
  onLeave,
  onClick,
}: {
  a: Attendee;
  m: Match;
  dim: boolean;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const c = TIER[m.tier].colour;
  return (
    <span
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
        <Avatar name={a.name} size={34} />
      </button>
      {hovered && <Hover a={a} m={m} />}
    </span>
  );
}

function YouPin() {
  return (
    <span
      className="grid h-[40px] w-[40px] place-items-center rounded-full text-[11px] font-bold text-white"
      style={{ background: "var(--brand)", boxShadow: "0 0 0 3px var(--card), 0 10px 24px -10px rgba(0,0,0,.55)" }}
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
          maxHeight: wide ? "64dvh" : "42dvh",
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

function Dock({ active, onSelect, waiting }: { active: Slot | null; onSelect: (s: Slot) => void; waiting: number }) {
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
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={on}
              className="flex w-[44px] flex-none flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 sm:w-[58px]"
              style={on ? { background: "color-mix(in srgb, var(--brand) 13%, transparent)" } : undefined}
            >
              <span className="relative text-[15px]" style={{ color: on ? "var(--brand)" : "var(--ink-soft)" }}>
                {s.icon}
                {s.id === "chats" && waiting > 0 && (
                  <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full" style={{ background: "var(--brand)" }} />
                )}
              </span>
              <span className="text-[9px] font-semibold sm:text-[10px]" style={{ color: on ? "var(--brand)" : "var(--ink)" }}>
                {s.label}
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

function Chat({
  who,
  sent,
  draft,
  setDraft,
  onSend,
}: {
  who: Attendee | null;
  sent: string[];
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
}) {
  if (!who)
    return (
      <p className="p-2 text-[12px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
        Pick somebody from <strong>For you</strong> and the opening line is already written — you
        edit and send. Messages stay in this browser; it&rsquo;s a demo of the room, not a real
        inbox.
      </p>
    );
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-2 pb-2">
        <Avatar name={who.name} size={26} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-bold">{who.name}</span>
          <span className="block truncate text-[10.5px]" style={{ color: "var(--ink-soft)" }}>
            {who.status === "checked_in" ? `In the room · ${ZONE_LABEL[who.zone]}` : "Not in the room yet"}
          </span>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {sent.length === 0 ? (
          <p className="text-[11.5px] italic" style={{ color: "var(--ink-soft)" }}>
            Draft below — edit it or send as it is.
          </p>
        ) : (
          sent.map((m, i) => (
            <p key={i} className="mb-1.5 ml-6 rounded-2xl rounded-br-sm p-2 text-[12px] leading-[1.45] text-white" style={{ background: "var(--brand)" }}>
              {m}
            </p>
          ))
        )}
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
          rows={3}
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
