"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { type MapRef } from "react-map-gl/mapbox";
import Avatar from "./Avatar";
import { IconChat, IconFeed, IconGlobe, IconPeople, IconPin, IconSparkle, IconUser } from "./Icons";
import {
  AREA_LABEL,
  AREA_ORDER,
  COMMUNITY,
  FEED,
  MEMBERS,
  TIER,
  TOPICS,
  THREADS,
  VOICE,
  YOU,
  couldHaveHelped,
  km,
  kmFromYou,
  matchOf,
  matchesFor,
  type Match,
  type Line,
  type Member,
  type Tier,
} from "@/lib/community";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

type Slot = "home" | "forYou" | "feed" | "people" | "near" | "chats" | "you";

const SLOTS: Array<{ id: Slot; label: string; icon: React.ReactNode }> = [
  { id: "home", label: "Home", icon: <IconGlobe size={17} /> },
  { id: "forYou", label: "For you", icon: <IconSparkle size={17} /> },
  { id: "feed", label: "Feed", icon: <IconFeed size={17} /> },
  { id: "people", label: "People", icon: <IconPeople size={17} /> },
  { id: "near", label: "Near me", icon: <IconPin size={17} /> },
  { id: "chats", label: "Chats", icon: <IconChat size={17} /> },
  { id: "you", label: "You", icon: <IconUser size={17} /> },
];

/**
 * Fifty members of a WhatsApp group, as something an admin can be sold.
 *
 * The sibling prototype at `/in-person-event` throws the floorplan away
 * the moment you ask it who to meet, because inside one building
 * everybody is ninety seconds apart and position carries almost nothing.
 * Here the opposite holds. A group is spread across a city, "who is in
 * Gachibowli" is a question with an answer, and the group chat cannot
 * answer it at any price — so the map is a real map, anchored to real
 * coordinates, and distance is a tiebreak the matcher actually uses.
 *
 * Two views for the same reason the event has two. **On the map** is the
 * city, honest about where people are. **By match** throws geography out
 * and sorts by what somebody is worth to you — still the only
 * arrangement that answers the question a member has, and still the one
 * a map cannot draw.
 *
 * The argument underneath both: a WhatsApp group has had all fifty of
 * these people in it for a year and surfaced about twelve of them.
 */
export default function CommunityMap() {
  /**
   * The map leads on a phone; the panel leads on a laptop. Same reason as
   * the event — half a phone screen given to a panel leaves the other
   * half too small to read fifty faces in.
   */
  const [slot, setSlot] = useState<Slot | null>(() =>
    typeof window !== "undefined" && window.innerWidth >= 640 ? "forYou" : null
  );
  const [view, setView] = useState<"map" | "match">("map");
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  /** The demo's sharpest filter, reached from Home rather than from
   *  permanent chrome: the members the chat has never surfaced. */
  const [quietOnly, setQuietOnly] = useState(false);
  const [chatWith, setChatWith] = useState<Member | null>(null);
  const [threads, setThreads] = useState<Record<string, Line[]>>(() =>
    Object.fromEntries(THREADS.map((t) => [t.withId, t.lines]))
  );
  const [unread, setUnread] = useState<Set<string>>(() => new Set(THREADS.filter((t) => t.unread).map((t) => t.withId)));
  const [draft, setDraft] = useState("");
  const [wide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 640);

  /** Measured, not guessed — see the event room for why a constant here
   *  clips the top of the map in every state but one. */
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
  const tierOf = useMemo(() => new Map(MEMBERS.map((m) => [m.id, matchOf(m)] as const)), []);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      MEMBERS.filter((m) => {
        if (openOnly && !m.openToMeet) return false;
        if (quietOnly && m.voice === "active") return false;
        if (!needle) return true;
        return [m.name, m.role, m.company, m.ask, m.offer, AREA_LABEL[m.area]].join(" ").toLowerCase().includes(needle);
      }),
    [needle, openOnly, quietOnly]
  );
  const shownIds = useMemo(() => new Set(shown.map((m) => m.id)), [shown]);
  const open = openId ? MEMBERS.find((m) => m.id === openId) ?? null : null;
  const openCount = MEMBERS.filter((m) => m.openToMeet).length;
  const unheard = MEMBERS.filter((m) => m.voice !== "active").length;

  function say(a: Member) {
    setChatWith(a);
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
      {view === "map" ? (
        <CityMap {...{ shownIds, tierOf, hoverId, setHoverId, wide, topH }} onOpen={pick} />
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
                className="grid h-6 w-6 flex-none place-items-center rounded-full"
                style={{ background: "#25D366" }}
              >
                <WhatsAppGlyph />
              </span>
              <span className="min-w-0 truncate text-[12.5px] font-semibold sm:max-w-[150px]">{COMMUNITY.name}</span>
            </button>

            <div className="relative order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search names, roles, areas, what people are after…"
                aria-label="Search the community"
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

            {/* The one filter worth permanent chrome in a group: everybody's
                number is visible to everybody, which is exactly why nobody
                knows who actually wants to be contacted. */}
            <button
              type="button"
              onClick={() => setOpenOnly((v) => !v)}
              aria-pressed={openOnly}
              className="flex-none rounded-full border px-2.5 py-1.5 text-[11.5px] font-semibold"
              style={
                openOnly
                  ? { background: "var(--good)", borderColor: "var(--good)", color: "#fff" }
                  : { borderColor: "var(--line)", color: "var(--ink)" }
              }
            >
              Open to meet {openCount}
            </button>

            <Toggle
              view={view}
              setView={(v) => {
                setView(v);
                if (v === "match" && !wide) setSlot(null);
              }}
            />
          </div>

          {(needle || openOnly || quietOnly) && (
            <p className="mt-1.5 flex items-center gap-2 px-2 text-[11.5px] font-semibold" style={{ color: "var(--ink-soft)" }}>
              <span>
                {shown.length} of {MEMBERS.length} shown
              </span>
              {quietOnly && (
                <button type="button" onClick={() => setQuietOnly(false)} className="underline" style={{ color: "var(--brand)" }}>
                  clear “rarely posts”
                </button>
              )}
            </p>
          )}
        </div>
      </header>

      {slot && (
        <Panel title={SLOTS.find((s) => s.id === slot)!.label} onClose={() => setSlot(null)} wide={wide}>
          {slot === "home" && (
            <Home
              unheard={unheard}
              openCount={openCount}
              onQuiet={() => {
                setQuietOnly(true);
                setSlot("people");
              }}
            />
          )}
          {slot === "forYou" && <ForYou matches={matches} onOpen={pick} onSay={say} />}
          {slot === "feed" && <FeedList onOpen={() => setSlot("people")} />}
          {slot === "people" && <People list={shown} tierOf={tierOf} onOpen={pick} />}
          {slot === "near" && <NearMe tierOf={tierOf} onOpen={pick} />}
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
          {slot === "you" && <YouPanel />}
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

type Block = {
  id: string;
  label: string;
  people: Member[];
  cols: number;
  w: number;
  h: number;
  /** Where the block ended up. */
  x: number;
  y: number;
  /** Where the locality actually is. The two differ once blocks are
   *  pushed apart, and the connector line admits it. */
  ax: number;
  ay: number;
};

/**
 * Eight localities pulled apart until they can be read.
 *
 * Blocks start on their true projected position and are then separated
 * by a short relaxation — push overlapping pairs apart along the line
 * between them, tug everything back towards its anchor, clamp to the
 * visible box, repeat. It is deterministic and converges in well under
 * the iteration cap at eight blocks.
 *
 * The honesty cost is real and worth naming: a displaced block is no
 * longer exactly where its locality is. That is why displacement draws a
 * connector back to the anchor point — the picture says "these eleven
 * people are here", which is as precise as a cluster bubble ever was,
 * and unlike a bubble you can read the faces.
 */
function relax(blocks: Block[], bounds: { x0: number; y0: number; x1: number; y1: number }): Block[] {
  const out = blocks.map((b) => ({ ...b }));
  const pad = 14;
  for (let step = 0; step < 120; step++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const needX = (a.w + b.w) / 2 + pad;
        const needY = (a.h + b.h) / 2 + pad;
        const overX = needX - Math.abs(dx);
        const overY = needY - Math.abs(dy);
        if (overX <= 0 || overY <= 0) continue;
        moved = true;
        // Separate along the cheaper axis, which keeps blocks closer to
        // the geography than always pushing on one of them.
        if (overX / needX < overY / needY) {
          const s = (overX / 2 + 0.5) * (dx >= 0 ? 1 : -1);
          a.x -= s;
          b.x += s;
        } else {
          const s = (overY / 2 + 0.5) * (dy >= 0 ? 1 : -1);
          a.y -= s;
          b.y += s;
        }
      }
    }
    for (const b of out) {
      // A gentle tug home, so separation never drifts further than it must.
      b.x += (b.ax - b.x) * 0.04;
      b.y += (b.ay - b.y) * 0.04;
      b.x = Math.min(Math.max(b.x, bounds.x0 + b.w / 2), bounds.x1 - b.w / 2);
      b.y = Math.min(Math.max(b.y, bounds.y0 + b.h / 2), bounds.y1 - b.h / 2);
    }
    if (!moved && step > 8) break;
  }
  return out;
}

/**
 * The city, with each locality a readable block of faces.
 *
 * On a laptop the blocks sit at their projected coordinates, so the IT
 * corridor is west and Secunderabad is off to the north-east, which is
 * the information. On a phone that 2D picture is unreadable at any face
 * size worth showing, so the same blocks stack nearest-first with the
 * distance printed — which on a phone is the more useful answer anyway,
 * and is still geography rather than an alphabetical list.
 */
function CityMap({
  shownIds,
  tierOf,
  hoverId,
  setHoverId,
  onOpen,
  wide,
  topH,
}: {
  shownIds: Set<string>;
  tierOf: Map<string, Match>;
  hoverId: string | null;
  setHoverId: (v: string | null) => void;
  onOpen: (id: string) => void;
  wide: boolean;
  topH: number;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [anchors, setAnchors] = useState<Record<string, { x: number; y: number }> | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Re-read the projection whenever the map moves, so blocks follow a
   *  pan or zoom instead of floating over a map that slid out from
   *  underneath them. */
  const reproject = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    const next: Record<string, { x: number; y: number }> = {};
    for (const a of AREA_ORDER) {
      const p = m.project([a.lng, a.lat]);
      next[a.id] = { x: p.x, y: p.y };
    }
    setAnchors(next);
  }, []);

  const padX = 14;
  const padTop = topH + 8;
  const padBottom = wide ? 92 : 96;
  const right = wide ? 372 : 0;
  const usableW = Math.max(size.w - right - padX * 2, 240);
  const availH = Math.max(size.h - padTop - padBottom, 260);

  const face = wide ? 38 : 34;
  const cellX = face + (wide ? 10 : 10);
  const cellY = face + (wide ? 10 : 10);
  const labelRoom = 20;

  const ordered = useMemo(
    () =>
      AREA_ORDER.map((a) => ({ ...a, d: kmFromYou({ lat: a.lat, lng: a.lng } as Member) })).sort((x, y) => x.d - y.d),
    []
  );

  /**
   * Wide: blocks are squarish, because they have to tile a plane.
   * Narrow: blocks are as wide as the screen, because they only have to
   * stack.
   */
  const colsFor = (n: number) =>
    wide
      ? Math.max(2, Math.min(5, Math.ceil(Math.sqrt(n * 1.5))))
      : Math.max(3, Math.min(8, Math.floor(usableW / cellX)));

  const base: Block[] = ordered.map((a) => {
    const people = MEMBERS.filter((m) => m.area === a.id);
    const cols = colsFor(people.length);
    const rows = Math.ceil(people.length / cols);
    const ax = anchors?.[a.id]?.x ?? padX + usableW / 2;
    const ay = anchors?.[a.id]?.y ?? padTop + availH / 2;
    return {
      id: a.id,
      label: a.label,
      people,
      cols,
      w: cols * cellX,
      h: rows * cellY + labelRoom,
      x: ax,
      y: ay,
      ax,
      ay,
    };
  });

  /** Shrink to fit rather than overflow, same rule as the event room. */
  const stackH = base.reduce((s, b) => s + b.h, 0) + (base.length - 1) * 10;
  const k = wide ? 1 : Math.min(1, availH / stackH);

  let blocks: Block[];
  if (wide) {
    blocks = relax(base, { x0: padX, y0: padTop, x1: padX + usableW, y1: padTop + availH });
  } else {
    let y = padTop + Math.max(0, (availH - stackH * k) / 2);
    blocks = base.map((b) => {
      const h = b.h * k;
      const placed = { ...b, w: b.w * k, h, x: padX + usableW / 2, y: y + h / 2 };
      y += h + 10 * k;
      return placed;
    });
  }

  const scale = wide ? 1 : k;
  const seatAt = (b: Block, i: number) => {
    const row = Math.floor(i / b.cols);
    const widthOfRow = Math.min(b.cols, b.people.length - row * b.cols);
    const top = b.y - b.h / 2 + labelRoom * scale;
    return {
      x: b.x + ((i % b.cols) - (widthOfRow - 1) / 2) * cellX * scale,
      y: top + row * cellY * scale + (cellY * scale) / 2,
    };
  };

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden">
      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={{ latitude: COMMUNITY.lat, longitude: COMMUNITY.lng, zoom: wide ? 12.55 : 12.1 }}
        minZoom={10}
        maxZoom={16}
        style={{ position: "absolute", inset: 0 }}
        onLoad={reproject}
        onMove={reproject}
        onResize={reproject}
        reuseMaps
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "color-mix(in srgb, var(--sunk) 52%, transparent)" }}
      />

      {/* The connector, drawn only when a block had to move to be read.
          Without it the picture would quietly claim a precision the
          relaxation just spent. */}
      {wide &&
        blocks.map((b) => {
          const dx = b.x - b.ax;
          const dy = b.y - b.ay;
          const len = Math.hypot(dx, dy);
          if (len < 26) return null;
          return (
            <span key={`link-${b.id}`} className="pointer-events-none absolute" style={{ left: b.ax, top: b.ay, zIndex: 1 }}>
              <span
                className="absolute origin-left"
                style={{
                  width: len,
                  height: 1,
                  transform: `rotate(${Math.atan2(dy, dx)}rad)`,
                  background: "color-mix(in srgb, var(--ink) 20%, transparent)",
                }}
              />
              <span
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{ left: -3, top: -3, background: "color-mix(in srgb, var(--ink) 34%, transparent)" }}
              />
            </span>
          );
        })}

      {blocks.map((b, bi) => {
        const here = b.people.filter((m) => shownIds.has(m.id)).length;
        const d = kmFromYou({ lat: AREA_ORDER.find((a) => a.id === b.id)!.lat, lng: AREA_ORDER.find((a) => a.id === b.id)!.lng } as Member);
        return (
          <span
            key={`label-${b.id}`}
            data-zone-label={b.id}
            className="pointer-events-none absolute whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] backdrop-blur"
            style={{
              left: b.x,
              top: b.y - b.h / 2 + 7 * scale,
              transform: "translate(-50%,-50%)",
              background: "color-mix(in srgb, var(--card) 86%, transparent)",
              color: "color-mix(in srgb, var(--ink) 52%, transparent)",
              zIndex: 4 + bi,
            }}
          >
            {b.label} · {here}
            <span style={{ color: "color-mix(in srgb, var(--ink) 34%, transparent)" }}> · {km(d)}</span>
          </span>
        );
      })}

      {blocks.flatMap((b) =>
        b.people.map((a, i) => {
          const p = seatAt(b, i);
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
                size={Math.round(face * scale)}
                dim={dim}
                hovered={hoverId === a.id}
                onEnter={() => !dim && setHoverId(a.id)}
                onLeave={() => setHoverId(null)}
                onClick={() => !dim && onOpen(a.id)}
              />
            </span>
          );
        })
      )}

      {/* You, in the locality you actually live in. */}
      {(() => {
        const home = blocks.find((b) => b.id === YOU.area);
        if (!home) return null;
        return (
          <span
            className="absolute"
            style={{
              left: home.x - home.w / 2 - 14 * scale,
              top: home.y - home.h / 2 + 8 * scale,
              transform: "translate(-50%,-50%)",
              zIndex: 70,
            }}
          >
            <YouPin size={Math.round(face * scale)} />
          </span>
        );
      })()}
    </div>
  );
}

/**
 * The same fifty, arranged by what they are worth to you.
 *
 * Distance from the centre is the match and nothing else. In a city this
 * earns its place twice over: the map answers "who is near me", and only
 * this answers "who is worth the trip".
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
  const pad = { top: 104, bottom: 96, left: 14, right: size.w >= 640 ? 372 : 14 };
  const cx = pad.left + (size.w - pad.left - pad.right) / 2;
  const cy = pad.top + (size.h - pad.top - pad.bottom) / 2;
  const unit = Math.max(Math.min(size.w - pad.left - pad.right, size.h - pad.top - pad.bottom) / 2 - 58, 96);

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" style={{ background: "var(--sunk)" }}>
      {TOPICS.map((t, ti) => {
        const ang = ti * ((Math.PI * 2) / TOPICS.length) - Math.PI / 2;
        return (
          <span
            key={`spoke-${t.id}`}
            className="pointer-events-none absolute origin-left"
            style={{
              left: cx,
              top: cy,
              width: unit * 1.1,
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

      {TOPICS.map((t, ti) => {
        const n = MEMBERS.filter((m) => m.askTopic === t.id).length;
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
        const band = MEMBERS.filter((m) => tierOf.get(m.id)!.tier === t);
        const baseR = unit * (0.27 + ri * 0.235);
        const perTopic = (Math.PI * 2) / TOPICS.length;
        const seen = new Map<string, number>();
        const inBandByTopic = new Map<string, number>();
        for (const x of band) inBandByTopic.set(x.askTopic, (inBandByTopic.get(x.askTopic) ?? 0) + 1);
        return band.map((a) => {
          const ti = TOPICS.findIndex((x) => x.id === a.askTopic);
          const seat = seen.get(a.askTopic) ?? 0;
          seen.set(a.askTopic, seat + 1);
          const count = inBandByTopic.get(a.askTopic) ?? 1;
          const frac = (seat + 1) / (count + 1);
          const angle = ti * perTopic + frac * perTopic * 0.78 + perTopic * 0.11 - Math.PI / 2;
          const r = baseR + (seat % 3) * unit * 0.055;
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

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="#fff" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.25 8.24a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.26-8.24Zm-2.5 4.3c-.15 0-.4.06-.6.29-.21.22-.8.78-.8 1.9s.82 2.2.93 2.36c.12.15 1.6 2.44 3.87 3.42.54.23.96.37 1.29.48.54.17 1.04.15 1.43.09.43-.07 1.34-.55 1.53-1.08.19-.53.19-.98.13-1.08-.06-.1-.21-.15-.44-.27-.23-.11-1.34-.66-1.55-.74-.21-.07-.36-.11-.51.12-.15.22-.58.73-.71.88-.13.15-.26.17-.49.06-.23-.12-.96-.36-1.84-1.13-.68-.6-1.14-1.35-1.27-1.58-.13-.22-.02-.34.1-.46.1-.1.23-.26.34-.4.11-.14.15-.23.23-.38.07-.15.04-.29-.02-.4-.06-.12-.5-1.23-.7-1.68-.18-.44-.37-.38-.5-.39h-.42Z" />
    </svg>
  );
}

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
  a: Member;
  m: Match;
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
      style={{ opacity: dim ? 0.14 : 1, transition: "opacity 180ms ease" }}
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
          /* Solid ring means you may message them. At an event the solid
             ring means "in the building", because that is the fact you
             can act on there; here everybody is reachable in principle
             and almost nobody knows who actually wants to be. */
          boxShadow: a.openToMeet
            ? `0 0 0 3px ${c}, 0 6px 18px -8px rgba(0,0,0,.45)`
            : "0 0 0 2px var(--card), 0 6px 16px -10px rgba(0,0,0,.4)",
          outline: a.openToMeet ? undefined : `2px dashed color-mix(in srgb, ${c} 55%, transparent)`,
          outlineOffset: a.openToMeet ? undefined : 2,
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

function Hover({ a, m }: { a: Member; m: Match }) {
  return (
    <span
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 block w-[250px] -translate-x-1/2 rounded-2xl border p-2.5 text-left"
      style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "0 22px 48px -22px rgba(0,0,0,.6)" }}
    >
      <span className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{a.name}</span>
        <VoiceTag a={a} />
      </span>
      <span className="block truncate text-[11px]" style={{ color: "var(--ink-soft)" }}>
        {a.role} · {a.company}
      </span>
      <span className="mt-0.5 block text-[10.5px] font-semibold" style={{ color: "var(--ink-soft)" }}>
        {AREA_LABEL[a.area]} · {km(kmFromYou(a))} away
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

function VoiceTag({ a }: { a: Member }) {
  const v = VOICE[a.voice];
  return (
    <span className="flex flex-none items-center gap-1 text-[9.5px] font-bold" style={{ color: v.colour }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.colour }} />
      {v.label}
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

function Toggle({ view, setView }: { view: "map" | "match"; setView: (v: "map" | "match") => void }) {
  return (
    <span className="flex flex-none rounded-full p-0.5" style={{ background: "color-mix(in srgb, var(--ink) 8%, transparent)" }}>
      {(["map", "match"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={view === v ? { background: "var(--card)", boxShadow: "0 2px 8px -4px rgba(0,0,0,.4)" } : { color: "var(--ink-soft)" }}
        >
          {v === "map" ? "On the map" : "By match"}
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
              <span className="relative" style={{ color: on ? "var(--brand)" : "var(--ink-soft)" }}>
                {s.id === "you" ? <Avatar name="You" size={19} /> : s.icon}
              </span>
              <span
                className="whitespace-nowrap text-[9px] font-semibold sm:text-[10.5px]"
                style={{ color: on ? "var(--brand)" : "var(--ink)" }}
              >
                {s.label}
                {n != null && n > 0 && <span style={{ color: on ? "var(--brand)" : "var(--ink-soft)" }}> {n}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── panels */

function Home({ unheard, openCount, onQuiet }: { unheard: number; openCount: number; onQuiet: () => void }) {
  const voices = new Set(FEED.map((f) => f.who.id)).size;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
        <p className="text-[15px] font-bold leading-tight">{COMMUNITY.name}</p>
        <p className="mt-0.5 text-[12px]" style={{ color: "var(--ink-soft)" }}>
          {COMMUNITY.platform} · {MEMBERS.length} members
        </p>
        <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>
          {COMMUNITY.created} · run by {COMMUNITY.admin}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat n={MEMBERS.length - unheard} label="post regularly" tone="var(--good)" />
        <Stat n={unheard} label="rarely or never" />
        <Stat n={openCount} label="open to meet" tone="var(--brand)" />
      </div>
      {/* The pitch, stated as a number the admin already half-knows. */}
      <p className="text-[12px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
        {COMMUNITY.messages.toLocaleString("en-IN")} messages this month, from {voices} people. The other{" "}
        <strong style={{ color: "var(--ink)" }}>{unheard}</strong> read everything and have never been visible to
        anyone — and between them they can answer most of what gets asked here.
      </p>
      <button
        type="button"
        onClick={onQuiet}
        className="rounded-full py-2 text-[12.5px] font-semibold text-white"
        style={{ background: "var(--brand)" }}
      >
        Show me the {unheard} the chat never surfaces
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
      <p className="mt-1 text-[10px] leading-[1.25]" style={{ color: "var(--ink-soft)" }}>
        {label}
      </p>
    </div>
  );
}

function ForYou({ matches, onOpen, onSay }: { matches: Match[]; onOpen: (id: string) => void; onSay: (a: Member) => void }) {
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
            <span className="flex-none text-right">
              <span className="block text-[10.5px] font-bold" style={{ color: "var(--ink)" }}>
                {km(m.distance)}
              </span>
              <span className="block text-[9.5px]" style={{ color: "var(--ink-soft)" }}>
                {AREA_LABEL[m.a.area]}
              </span>
            </span>
          </button>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <TierBadge m={m} />
            <VoiceTag a={m.a} />
          </span>
          <p className="mt-1 text-[11.5px] leading-[1.45]" style={{ color: "var(--ink-soft)" }}>
            {m.reason}
          </p>
          <p className="mt-1.5 rounded-xl p-2 text-[11.5px] italic leading-[1.4]" style={{ background: "var(--sunk)" }}>
            “{m.opener}”
          </p>
          <button
            type="button"
            onClick={() => onSay(m.a)}
            className="mt-2 w-full rounded-full py-1.5 text-[12px] font-semibold text-white"
            style={{ background: "var(--brand)" }}
          >
            Edit and send
          </button>
        </li>
      ))}
    </ul>
  );
}

function People({ list, tierOf, onOpen }: { list: Member[]; tierOf: Map<string, Match>; onOpen: (id: string) => void }) {
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
                  <VoiceTag a={a} />
                </span>
                <span className="block truncate text-[10.5px]" style={{ color: "var(--ink-soft)" }}>
                  {a.role} · {AREA_LABEL[a.area]} · {km(kmFromYou(a))}
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

/**
 * The group chat, with what it cost.
 *
 * The unanswered ones carry a line saying how many people on this map
 * had already published the matching offer. That sentence is the demo:
 * the help was in the room the whole time and the medium had no way to
 * route it.
 */
function FeedList({ onOpen }: { onOpen: () => void }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {FEED.map((p) => {
        const could = couldHaveHelped(p);
        const dropped = p.replies === 0 && could > 0;
        return (
          <li key={p.id} className="flex gap-2">
            <Avatar name={p.who.name} size={26} />
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px]">
                <strong className="font-bold">{p.who.name}</strong>
                <span style={{ color: "var(--ink-soft)" }}> · {p.ago}</span>
              </span>
              <span className="mt-0.5 block text-[12px] leading-[1.45]">{p.text}</span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold">
                <span style={{ color: p.replies === 0 ? "var(--ink-soft)" : "var(--ink-soft)" }}>
                  {p.replies === 0 ? "no replies" : `${p.replies} replies`}
                </span>
                {dropped && (
                  <button
                    type="button"
                    onClick={onOpen}
                    className="rounded-full px-2 py-0.5"
                    style={{ background: "color-mix(in srgb, var(--brand) 13%, transparent)", color: "var(--brand)" }}
                  >
                    {could} people here could have answered →
                  </button>
                )}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Everyone, sorted by how far they are — the question a group chat
 * cannot be asked, and the one that turns a member into a coffee.
 */
function NearMe({ tierOf, onOpen }: { tierOf: Map<string, Match>; onOpen: (id: string) => void }) {
  const near = useMemo(
    () =>
      MEMBERS.map((m) => ({ m, d: kmFromYou(m) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 14),
    []
  );
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
        You&rsquo;re in <strong style={{ color: "var(--ink)" }}>{AREA_LABEL[YOU.area]}</strong>. Everyone is shown to
        the nearest neighbourhood, never to an address — close enough to suggest coffee, not close enough to find
        anyone&rsquo;s front door.
      </p>
      <ul className="flex flex-col gap-1">
        {near.map(({ m, d }) => {
          const t = tierOf.get(m.id)!;
          return (
            <li key={m.id}>
              <button type="button" onClick={() => onOpen(m.id)} className="flex w-full items-center gap-2 rounded-xl p-1.5 text-left">
                <span className="flex-none rounded-full" style={{ boxShadow: `0 0 0 2px ${TIER[t.tier].colour}`, borderRadius: 999 }}>
                  <Avatar name={m.name} size={26} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold">{m.name}</span>
                  <span className="block truncate text-[10.5px]" style={{ color: "var(--ink-soft)" }}>
                    {m.role} · {AREA_LABEL[m.area]}
                  </span>
                </span>
                <span className="flex-none text-[11px] font-bold">{km(d)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function YouPanel() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <YouPin />
        <span className="min-w-0">
          <span className="block text-[13px] font-bold">{YOU.name}</span>
          <span className="block text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
            {YOU.role} · {AREA_LABEL[YOU.area]}
          </span>
        </span>
      </div>
      <Ask side="ask" text={YOU.ask} />
      <Ask side="offer" text={YOU.offer} />
      <p className="text-[11.5px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
        These two lines are what the community matches on. Everything else is introduction; this is the part that gets
        you found — including by the people who will never post.
      </p>
    </div>
  );
}

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
  who: Member | null;
  threads: Record<string, Line[]>;
  unread: Set<string>;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  onPick: (a: Member) => void;
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
          const a = MEMBERS.find((x) => x.id === id);
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
            {AREA_LABEL[who.area]} · {km(kmFromYou(who))} away
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

function Profile({ a, m, onClose, onSay }: { a: Member; m: Match; onClose: () => void; onSay: () => void }) {
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
            <p className="truncate text-[11.5px] font-semibold" style={{ color: "var(--ink-soft)" }}>
              {AREA_LABEL[a.area]} · {km(kmFromYou(a))} away
            </p>
          </div>
        </div>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <TierBadge m={m} />
          <VoiceTag a={a} />
        </span>
        {/* The membership facts a group chat has but never shows you. */}
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--ink-soft)" }}>
          In the group {a.joined} · {a.posts === 0 ? "has never posted" : `${a.posts} messages this month`} ·{" "}
          {a.openToMeet ? "open to meeting people" : "has not opted in to messages"}
        </p>
        <p className="mt-2 text-[12.5px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
          {a.bio}
        </p>
        <Ask side="ask" text={a.ask} />
        <Ask side="offer" text={a.offer} />
        <button
          type="button"
          onClick={onSay}
          disabled={!a.openToMeet}
          className="mt-3 w-full rounded-full py-2 text-[13px] font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--brand)" }}
        >
          {a.openToMeet ? (m.tier === "none" ? "Say hello" : "Open with a draft") : "Not open to messages"}
        </button>
      </div>
    </div>
  );
}
