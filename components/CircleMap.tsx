"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Aliased: the default export is named `Map`, which would shadow the global.
import MapGL, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { avatarUrl } from "@/lib/avatar";
import { entityById } from "@/lib/networks";
import {
  ALL_CIRCLE_EVENTS,
  activePings,
  attendeesOf,
  beaconPoint,
  beaconsAt,
  cityById,
  eventById,
  memberById,
  membersOf,
  pointOf,
  qualifiedName,
  CIRCLE_POSTS,
  rnd,
  type CircleEvent,
  type TravelPing,
  type CircleMember,
  type LocationMode,
} from "@/lib/circleData";
import { clearMe, getMe, setMe, type CircleMe } from "@/lib/circleMe";
import type { MockMessage } from "@/lib/chatData";
import FloatingPage, { type PageSize } from "./FloatingPage";
import ChatWindow from "./ChatWindow";
import CircleEventPanel from "./CircleEventPanel";
import CircleYouPanel from "./CircleYouPanel";
import CircleFeed, { EVERYTHING } from "./CircleFeed";
import CircleMeetupForm from "./CircleMeetupForm";
import CircleDigest from "./CircleDigest";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";
/**
 * Zoom at which city bubbles give way to individual pins. Deliberately
 * metro-level: a live member sits within ~6km of their city centre, which is
 * a handful of pixels on a continental view — breaking them out any earlier
 * just piles the avatars on top of each other.
 */
const PRECISE_ZOOM = 9;

/** Openers, so a cold thread has something in it. Deterministic per member. */
function seedThread(m: CircleMember, communityName: string): MockMessage[] {
  const h = rnd(`thread-${m.id}`);
  if (h % 3 === 0) return [];
  const city = cityById(m.cityId)?.name ?? "town";
  const lines = [
    `Saw you on the ${communityName} map. I'm in ${city} — shout if you're ever through.`,
    `We're both in ${communityName}. Working on anything you'd want a second pair of eyes on?`,
    `${city} here. Happy to make intros locally if that's ever useful.`,
  ];
  return [{ id: `s-${m.id}`, mine: false, body: lines[h % lines.length], timeLabel: "2d" }];
}

type View = string;

type CityGroup = { city: NonNullable<ReturnType<typeof cityById>>; members: CircleMember[] };

/** Members bucketed into the cities they sit in, biggest first. */
function groupByCity(members: CircleMember[]): CityGroup[] {
  const byCity = new Map<string, CircleMember[]>();
  for (const m of members) {
    const list = byCity.get(m.cityId);
    if (list) list.push(m);
    else byCity.set(m.cityId, [m]);
  }
  return [...byCity.entries()]
    .map(([id, list]) => ({ city: cityById(id), members: list }))
    .filter((g): g is CityGroup => Boolean(g.city))
    .sort((a, b) => b.members.length - a.members.length);
}

/**
 * The members-only map.
 *
 * Deliberately a second, separate experience from the public map at "/":
 * there is no public network here at all. You see the people in communities
 * you've been invited into, anywhere on earth, and nobody outside those
 * communities can see you. Every surface below follows from that — no
 * connection requests (membership already vouched for you, so you can
 * message anyone), no discovery of strangers, and a location control that's
 * the first thing on your own page rather than the last.
 */
export default function CircleMap() {
  const mapRef = useRef<MapRef | null>(null);
  const [me, setMeState] = useState<CircleMe | null>(() => getMe());
  const [activeEntityId, setActiveEntityId] = useState<string>(() => getMe()?.entityIds[0] ?? "");
  const [stack, setStack] = useState<View[]>([]);
  const [panelSize, setPanelSize] = useState<PageSize>("side");
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  /** Drives the two map layers below — see PRECISE_ZOOM. */
  const [zoom, setZoom] = useState(1.6);
  /** Which level of the hierarchy the feed is pointed at. */
  const [feedLevel, setFeedLevel] = useState<string>(EVERYTHING);
  /** Meetups you call this session, on top of the seeded ones. */
  const [myEvents, setMyEvents] = useState<CircleEvent[]>([]);
  /** A travel ping opened from the feed or the digest — flies the map to its city. */
  const [openPing, setOpenPing] = useState<TravelPing | null>(null);
  const [digestOff, setDigestOff] = useState(false);
  /** Events you've said you're coming to, this session. */
  const [going, setGoing] = useState<Set<string>>(new Set());

  const view = stack[stack.length - 1] ?? null;
  const entity = entityById(activeEntityId);

  const update = useCallback((patch: Partial<CircleMe>) => {
    setMeState((cur) => {
      if (!cur) return cur;
      const next = { ...cur, ...patch };
      setMe(next);
      return next;
    });
  }, []);

  const push = (v: View) => setStack((s) => [...s, v]);
  const open = (v: View) => setStack([v]);
  const pop = () => setStack((s) => s.slice(0, -1));

  // ── who's on this map ────────────────────────────────────────────────
  const members = useMemo(() => membersOf(activeEntityId), [activeEntityId]);

  // Declared before the member layers because they depend on it; the full
  // event object is resolved further down once `events` exists.
  const openEventId = view?.startsWith("event:") ? view.slice(6) : null;

  const q = query.trim().toLowerCase();
  const matching = useMemo(
    () =>
      members.filter((m) => {
        if (cityFilter && m.cityId !== cityFilter) return false;
        if (!q) return true;
        return `${m.name} ${m.headline} ${m.company} ${cityById(m.cityId)?.name ?? ""}`.toLowerCase().includes(q);
      }),
    [members, q, cityFilter]
  );

  // An online event has no venue, so the map does the thing only it can:
  // it shows where everyone joining from actually is. Same bubbles, different
  // population — which is the picture the panel's copy promises.
  const openEventEarly = openEventId ? ([...myEvents, ...ALL_CIRCLE_EVENTS].find((e) => e.id === openEventId) ?? null) : null;
  const onlineEvent = openEventEarly?.kind === "online" ? openEventEarly : null;
  const base = onlineEvent ? attendeesOf(onlineEvent) : matching;
  const onMap = base.filter((m) => m.mode !== "off");
  const offMapCount = base.length - onMap.length;
  const liveMembers = onMap.filter((m) => m.mode === "live");
  /**
   * Below this, a city is one bubble; above it, the people sharing live
   * location break out into pins of their own. Drawing both at world zoom
   * put a bubble reading "1" on top of the very pin it was counting.
   */
  const precise = zoom >= PRECISE_ZOOM;

  /** One bubble per city: the coarse, city-level truth about where the community is. */
  const cityGroups = groupByCity(onMap);

  // ── events and beacons ───────────────────────────────────────────────
  /** Events hosted by any community you're in — live ones first. */
  const events = useMemo(() => {
    const mine = new Set([...(me?.entityIds ?? []), activeEntityId]);
    return [...myEvents, ...ALL_CIRCLE_EVENTS]
      .filter((e) => mine.has(e.hostEntityId))
      .sort((a, b) => Number(b.liveNow) - Number(a.liveNow) || a.daysAway - b.daysAway);
  }, [me, activeEntityId, myEvents]);

  /** Live travel pings in this community — the map's only time-boxed layer. */
  const pings = useMemo(() => activePings(activeEntityId), [activeEntityId]);
  // Resolve against the live list, not just the seeded one — a meetup you
  // called this session exists only in state, and opening it must still work.
  const findEvent = (id: string) => events.find((e) => e.id === id) ?? eventById(id) ?? null;
  const openEvent: CircleEvent | null = openEventId ? findEvent(openEventId) : null;
  const beaconEvent = me?.beaconEventId ? findEvent(me.beaconEventId) : null;
  /** The venue view is on when you're looking at a live event or beaconing at one. */
  const venueEvent = (openEvent?.liveNow && openEvent.lat != null ? openEvent : beaconEvent?.lat != null ? beaconEvent : null) ?? null;
  const venueBeacons = beaconsAt(venueEvent);

  const flyToVenue = useCallback((e: CircleEvent) => {
    if (e.lat == null || e.lng == null) return;
    mapRef.current?.flyTo({ center: [e.lng, e.lat], zoom: 16.5, duration: 1600 });
  }, []);

  const flyToCity = useCallback((cityId: string) => {
    const c = cityById(cityId);
    if (c) mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 10.5, duration: 1400 });
  }, []);

  function toggleBeacon(on: boolean) {
    if (!openEvent) return;
    update({ beaconEventId: on ? openEvent.id : null });
    if (on) flyToVenue(openEvent);
  }

  // Frame the community whenever it changes, so switching always shows you
  // the whole world rather than wherever you last were.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || cityGroups.length === 0 || venueEvent) return;
    // One city is a point, and fitting a point lands on maxZoom — which is
    // the whole state. Narrowing to a city should actually arrive in it, and
    // past PRECISE_ZOOM so its people break out of the bubble.
    if (cityGroups.length === 1) {
      const only = cityGroups[0].city;
      map.flyTo({ center: [only.lng, only.lat], zoom: 10.5, duration: 1400 });
      return;
    }
    const lats = cityGroups.map((g) => g.city.lat);
    const lngs = cityGroups.map((g) => g.city.lng);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: { top: 80, bottom: 140, left: 60, right: stack.length > 0 ? 480 : 60 }, duration: 1400, maxZoom: 5 }
    );
    // Re-frames on community or city-filter change only — not on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntityId, cityFilter]);

  useEffect(() => {
    if (venueEvent) flyToVenue(venueEvent);
  }, [venueEvent, flyToVenue]);

  // Opening an event moves the map to it: a located one to its city, an
  // online one out to the whole spread of people joining.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !openEvent || openEvent.liveNow) return;
    if (openEvent.kind === "online") {
      map.flyTo({ center: [30, 25], zoom: 1.5, duration: 1400 });
    } else if (openEvent.cityId) {
      flyToCity(openEvent.cityId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openEvent?.id]);

  // ── no invite yet ────────────────────────────────────────────────────
  if (!me) return <NeedsInvite />;

  /** What the one open window is called. */
  function titleFor(v: string): string {
    if (v === "feed") return "Feed";
    if (v === "meetup") return "Call a meetup";
    if (v === "people") return qualifiedName(activeEntityId) || "Members";
    if (v === "events") return "Events";
    if (v === "chats") return "Chats";
    if (v === "you") return "You";
    if (v.startsWith("event:")) return openEvent?.name ?? "Event";
    if (v.startsWith("member:")) return memberById(v.slice(7))?.name ?? "Member";
    if (v.startsWith("chat:")) return memberById(v.slice(5))?.name ?? "Chat";
    return "";
  }
  const title = view ? titleFor(view) : "";

  return (
    <div className="fixed inset-0">
      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        projection="mercator"
        initialViewState={{ longitude: 30, latitude: 25, zoom: 1.6 }}
        onClick={() => setPinned(null)}
        onMove={(e) => setZoom(e.viewState.zoom)}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* City bubbles — the coarse layer. Everyone on the map is counted
            here; those sharing live location also get a pin of their own. */}
        {!venueEvent &&
          cityGroups.map((g) => {
            // Zoomed out, the bubble stands for everyone in the city. Once the
            // precise pins appear it stands only for the people who aren't in
            // them, so nobody is counted twice.
            const shown = precise ? g.members.filter((m) => m.mode === "base") : g.members;
            if (shown.length === 0) return null;
            const size = Math.min(62, 24 + Math.sqrt(shown.length) * 6);
            return (
              <Marker key={g.city.id} longitude={g.city.lng} latitude={g.city.lat} anchor="center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCityFilter(g.city.id);
                    open("people");
                  }}
                  className="grid place-items-center rounded-full font-bold text-white transition-transform hover:scale-110"
                  style={{
                    width: size,
                    height: size,
                    fontSize: size > 44 ? 14 : 12,
                    background: "color-mix(in srgb, var(--brand) 82%, transparent)",
                    border: "2px solid var(--card)",
                    boxShadow: "var(--shadow-lift)",
                  }}
                  title={
                    precise
                      ? `${shown.length} in ${g.city.name} sharing city only`
                      : `${g.members.length} in ${g.city.name}`
                  }
                >
                  {shown.length}
                </button>
              </Marker>
            );
          })}

        {/* The precise layer — only members who chose to share it. */}
        {!venueEvent &&
          precise &&
          liveMembers.map((m) => {
            const pt = pointOf(m);
            if (!pt) return null;
            return (
              <Marker key={m.id} longitude={pt[0]} latitude={pt[1]} anchor="center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinned(m.id);
                  }}
                  className="block h-6 w-6 rounded-full"
                  style={{ padding: 0, border: "2px solid var(--card)", boxShadow: "var(--shadow)", overflow: "hidden" }}
                  title={m.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl(m.name)} alt="" className="h-full w-full object-cover" />
                </button>
              </Marker>
            );
          })}

        {/* Venue view: everyone beaconing, metres apart. */}
        {venueEvent &&
          venueBeacons.map((m) => {
            const pt = beaconPoint(venueEvent, m);
            if (!pt) return null;
            return (
              <Marker key={m.id} longitude={pt[0]} latitude={pt[1]} anchor="center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinned(m.id);
                  }}
                  className="beacon-ring block h-8 w-8 rounded-full"
                  style={{ padding: 0, border: "2px solid var(--card)", overflow: "hidden" }}
                  title={`${m.name} — here now`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl(m.name)} alt="" className="h-full w-full object-cover" />
                </button>
              </Marker>
            );
          })}

        {/* Meetups and events with a place. A member-called meetup in a city
            is a different object from an institution's event, and reads as one. */}
        {!venueEvent &&
          events
            .filter((e) => e.lat != null && e.lng != null)
            .map((e) => (
              <Marker key={e.id} longitude={e.lng!} latitude={e.lat!} anchor="center">
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    push(`event:${e.id}`);
                  }}
                  className={`grid h-7 w-7 place-items-center rounded-xl text-[13px]${e.liveNow ? " beacon-ring" : ""}`}
                  style={{
                    background: "var(--card)",
                    border: `2px solid ${e.kind === "meetup" ? "var(--ink-soft)" : "var(--brand)"}`,
                    boxShadow: "var(--shadow)",
                  }}
                  title={`${e.name} — ${e.dateLabel}`}
                >
                  {e.kind === "meetup" ? "📍" : "📅"}
                </button>
              </Marker>
            ))}

        {/* Travel pings: someone who will be somewhere, soon. Time-boxed, and
            pinned to where they're going rather than where they live. */}
        {!venueEvent &&
          pings.slice(0, 40).map((p) => {
            const c = cityById(p.cityId);
            const m = memberById(p.memberId);
            if (!c || !m) return null;
            // Offset so a ping never sits exactly under its city's bubble.
            const off = (rnd(`pingoff-${p.id}`) % 60) / 1000 + 0.06;
            return (
              <Marker key={p.id} longitude={c.lng + off} latitude={c.lat + off * 0.6} anchor="center">
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setOpenPing(p);
                  }}
                  className="grid h-7 w-7 place-items-center rounded-full text-[12px]"
                  style={{ background: "var(--card)", border: "2px dashed var(--brand)", boxShadow: "var(--shadow)" }}
                  title={`${m.name} in ${c.name} · ${p.datesLabel}`}
                >
                  ✈️
                </button>
              </Marker>
            );
          })}

        {/* You. */}
        {me.beaconEventId && beaconEvent?.lat != null && beaconEvent?.lng != null && venueEvent?.id === beaconEvent.id ? (
          <Marker longitude={beaconEvent.lng} latitude={beaconEvent.lat} anchor="center">
            <span className="beacon-ring grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: "var(--ink)", border: "2px solid var(--card)" }}>
              You
            </span>
          </Marker>
        ) : (
          me.mode !== "off" &&
          !venueEvent && (
            <Marker longitude={cityById(me.cityId)!.lng} latitude={cityById(me.cityId)!.lat} anchor="center">
              <span
                className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ background: "var(--ink)", border: "2px solid var(--card)", boxShadow: "var(--shadow-lift)" }}
                title={`You — ${me.mode === "live" ? "live location" : "city only"}`}
              >
                You
              </span>
            </Marker>
          )
        )}

        {openPing &&
          (() => {
            const c = cityById(openPing.cityId);
            const m = memberById(openPing.memberId);
            if (!c || !m) return null;
            const off = (rnd(`pingoff-${openPing.id}`) % 60) / 1000 + 0.06;
            return (
              <Popup
                longitude={c.lng + off}
                latitude={c.lat + off * 0.6}
                anchor="top"
                offset={18}
                closeButton={false}
                closeOnClick={false}
                maxWidth="300px"
                onClose={() => setOpenPing(null)}
              >
                <div className="w-[256px]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
                    Passing through
                  </p>
                  <p className="mt-1 text-[13px] font-semibold leading-tight">
                    {m.name} in {c.name}
                  </p>
                  <p className="text-[11.5px] text-[var(--ink-soft)]">
                    {openPing.datesLabel} · {openPing.daysAway <= 0 ? "here now" : `in ${openPing.daysAway} days`}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-4">&ldquo;{openPing.note}&rdquo;</p>
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => push(`chat:${m.id}`)} className="btn btn-primary btn-sm flex-1">
                      Message
                    </button>
                    <button onClick={() => push("meetup")} className="btn btn-ghost btn-sm flex-1" title="Turn this into a meetup">
                      Meet up
                    </button>
                  </div>
                </div>
              </Popup>
            );
          })()}

        {pinned &&
          (() => {
            const m = memberById(pinned);
            if (!m) return null;
            const pt = venueEvent ? beaconPoint(venueEvent, m) : pointOf(m);
            if (!pt) return null;
            return (
              <Popup longitude={pt[0]} latitude={pt[1]} anchor="top" offset={20} closeButton={false} closeOnClick={false} maxWidth="280px">
                <MemberCard m={m} onMessage={() => push(`chat:${m.id}`)} onOpen={() => push(`member:${m.id}`)} />
              </Popup>
            );
          })()}
      </MapGL>

      {/* ── top: which community you're looking at ── */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[1200] flex justify-center px-3 sm:top-5">
        <div className="pointer-events-auto relative">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="flex items-center gap-2 rounded-2xl border border-[var(--line)] py-2 pl-3 pr-2.5"
            style={{ background: "color-mix(in srgb, var(--card) 95%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
          >
            <span className="text-[16px] leading-none">{entity?.emoji}</span>
            <span className="text-[13px] font-semibold">{qualifiedName(activeEntityId)}</span>
            <span className="text-[11.5px] text-[var(--ink-soft)]">
              {onMap.length} on the map
              {offMapCount > 0 ? ` · ${offMapCount} off it` : ""}
            </span>
            {me.entityIds.length > 1 && <span className="text-[var(--ink-soft)]">▾</span>}
          </button>

          {switcherOpen && me.entityIds.length > 1 && (
            <div className="card absolute left-1/2 top-[52px] w-64 -translate-x-1/2 p-1.5">
              {me.entityIds.map((id) => {
                const e = entityById(id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveEntityId(id);
                      setCityFilter(null);
                      setSwitcherOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-[var(--sunk)]"
                  >
                    <span className="text-[15px]">{e?.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{qualifiedName(id)}</span>
                    <span className="text-[11px] text-[var(--ink-soft)]">{membersOf(id).length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* The map is showing someone else's population — say so, or the count
          in the bar above reads as the community's when it isn't. */}
      {onlineEvent && (
        <div className="pointer-events-none fixed inset-x-0 top-[68px] z-[1200] flex justify-center px-3 sm:top-[76px]">
          <div
            className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-[var(--line)] px-3 py-1.5"
            style={{ background: "color-mix(in srgb, var(--card) 95%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow)" }}
          >
            <span className="text-[12px]">🌐</span>
            <span className="text-[12px] font-semibold">Showing who&rsquo;s joining {onlineEvent.name}</span>
          </div>
        </div>
      )}

      {/* ── the beacon banner: impossible to leave on by accident ── */}
      {beaconEvent && (
        <div className="pointer-events-none fixed inset-x-0 top-[68px] z-[1200] flex justify-center px-3 sm:top-[76px]">
          <div
            className="pointer-events-auto flex items-center gap-2 rounded-2xl px-3 py-2 text-white"
            style={{ background: "var(--brand)", boxShadow: "var(--shadow-lift)" }}
          >
            <span className="beacon-dot" style={{ background: "white" }} />
            <span className="text-[12px] font-semibold">Beaconing at {beaconEvent.name}</span>
            <button onClick={() => update({ beaconEventId: null })} className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
              Stop
            </button>
          </div>
        </div>
      )}

      {/* ── bottom bar ── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1350] flex justify-center px-3">
        <div
          className="pointer-events-auto flex items-center gap-1 rounded-3xl border border-[var(--line)] p-1.5"
          style={{ background: "color-mix(in srgb, var(--card) 94%, transparent)", backdropFilter: "blur(14px)", boxShadow: "var(--shadow-lift)" }}
        >
          <BarButton emoji="📣" label="Feed" on={view === "feed"} onClick={() => open("feed")} />
          <BarButton emoji="👥" label="People" count={members.length} on={view === "people"} onClick={() => open("people")} />
          <BarButton emoji="📅" label="Events" count={events.length} on={view === "events"} onClick={() => open("events")} />
          <BarButton emoji="💬" label="Chats" on={view === "chats" || Boolean(view?.startsWith("chat:"))} onClick={() => open("chats")} />
          <span className="mx-0.5 h-8 w-px flex-none" style={{ background: "var(--line)" }} />
          <button
            onClick={() => open("you")}
            className="relative flex flex-none items-center gap-1.5 rounded-2xl py-1 pl-1 pr-2.5"
            style={view === "you" ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))" } : undefined}
            title="You — location and communities"
          >
            <span className="avatar h-8 w-8 text-[11px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl(me.name)} alt="" />
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "var(--ink-soft)" }}>
              {me.mode === "off" ? "Off the map" : me.mode === "live" ? "Live" : "City"}
            </span>
          </button>
        </div>
      </div>

      {!view && !digestOff && !venueEvent && (
        <CircleDigest
          me={me}
          pings={pings}
          events={events}
          newPostCount={CIRCLE_POSTS.filter((p) => p.minutesAgo < 2880).length}
          onCity={flyToCity}
          onPing={(p) => {
            setOpenPing(p);
            flyToCity(p.cityId);
          }}
          onEvent={(id) => push(`event:${id}`)}
          onFeed={() => open("feed")}
          onDismiss={() => setDigestOff(true)}
        />
      )}

      {/* ── one window, whatever's open ── */}
      {view && (
        <FloatingPage
          title={title}
          emoji={
            view === "feed"
              ? "📣"
              : view === "meetup"
                ? "📍"
                : view === "people"
                  ? (entity?.emoji ?? "👥")
                  : view === "events" || view.startsWith("event:")
                    ? "📅"
                    : view === "you"
                      ? "🙋"
                      : view === "chats" || view.startsWith("chat:")
                        ? "💬"
                        : "👤"
          }
          canGoBack={stack.length > 1}
          size={panelSize}
          onBack={pop}
          onClose={() => setStack([])}
          onSize={setPanelSize}
        >
          {view === "people" && (
            <PeopleList
              members={matching}
              total={members.length}
              offMapCount={offMapCount}
              query={query}
              cityFilter={cityFilter}
              cityGroups={cityGroups}
              onQuery={setQuery}
              onCity={(id) => {
                setCityFilter(id);
                const c = id ? cityById(id) : null;
                if (c) mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 9, duration: 1200 });
              }}
              onOpen={(id) => push(`member:${id}`)}
            />
          )}

          {view === "feed" && (
            <CircleFeed
              me={me}
              level={feedLevel}
              pings={pings}
              onLevel={setFeedLevel}
              onOpenMember={(id) => push(`member:${id}`)}
              onOpenCity={(id) => {
                setCityFilter(null);
                flyToCity(id);
              }}
              onOpenPing={(p) => {
                setOpenPing(p);
                flyToCity(p.cityId);
              }}
              onCompose={() => {}}
              onStartMeetup={() => push("meetup")}
            />
          )}

          {view === "meetup" && (
            <CircleMeetupForm
              me={me}
              onCancel={pop}
              onCreate={(e) => {
                setMyEvents((cur) => [e, ...cur]);
                setStack(["events", `event:${e.id}`]);
                if (e.cityId) flyToCity(e.cityId);
              }}
            />
          )}

          {view === "events" && <EventsList events={events} myCityId={me.cityId} onOpen={(id) => push(`event:${id}`)} onStart={() => push("meetup")} />}

          {view === "chats" && <ChatsList members={members} onOpen={(id) => push(`chat:${id}`)} />}

          {view === "you" && (
            <CircleYouPanel
              me={me}
              beaconEventName={beaconEvent?.name ?? null}
              onMode={(m: LocationMode) => update({ mode: m })}
              onCity={(id) => update({ cityId: id })}
              onStopBeacon={() => update({ beaconEventId: null })}
              onOpenCommunity={(id) => {
                setActiveEntityId(id);
                setCityFilter(null);
                open("people");
              }}
              onLeave={() => {
                clearMe();
                setMeState(null);
              }}
            />
          )}

          {openEvent && (
            <CircleEventPanel
              event={openEvent}
              beaconing={me.beaconEventId === openEvent.id}
              going={going.has(openEvent.id)}
              meName={me.name}
              onBeacon={toggleBeacon}
              onGoing={(v) =>
                setGoing((cur) => {
                  const next = new Set(cur);
                  if (v) next.add(openEvent.id);
                  else next.delete(openEvent.id);
                  return next;
                })
              }
              onOpenMember={(id) => push(`member:${id}`)}
            />
          )}

          {view.startsWith("member:") &&
            (() => {
              const m = memberById(view.slice(7));
              if (!m) return null;
              return <MemberPanel m={m} onMessage={() => push(`chat:${m.id}`)} />;
            })()}

          {view.startsWith("chat:") &&
            (() => {
              const m = memberById(view.slice(5));
              if (!m) return null;
              return (
                <ChatWindow
                  key={m.id}
                  name={m.name}
                  photoUrl={avatarUrl(m.name)}
                  headline={`${m.headline} · ${m.company}`}
                  wide={panelSize !== "side"}
                  initialMessages={seedThread(m, entity?.name ?? "the community")}
                />
              );
            })()}
        </FloatingPage>
      )}
    </div>
  );
}

function BarButton({ emoji, label, count, on, onClick }: { emoji: string; label: string; count?: number; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-[72px] flex-none flex-col items-center gap-0.5 rounded-2xl py-1.5"
      style={on ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))" } : undefined}
    >
      <span className="text-[16px] leading-none">{emoji}</span>
      <span className="text-[11px] font-semibold" style={{ color: on ? "var(--brand)" : "var(--ink-soft)" }}>
        {label}
        {count != null ? ` ${count}` : ""}
      </span>
    </button>
  );
}

/** What someone's location setting means, said plainly wherever they appear. */
function modeLine(m: CircleMember): string {
  const city = cityById(m.cityId)?.name ?? "";
  if (m.mode === "off") return "Not sharing a location";
  if (m.mode === "base") return `${city} · city only`;
  return `${city} · sharing live`;
}

function MemberCard({ m, onMessage, onOpen }: { m: CircleMember; onMessage: () => void; onOpen: () => void }) {
  return (
    <div className="w-[240px]">
      <button onClick={onOpen} className="flex w-full items-center gap-2.5 text-left">
        <span className="avatar h-10 w-10 flex-none text-[12px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl(m.name)} alt="" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold leading-tight">{m.name}</span>
          <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
            {m.headline} · {m.company}
          </span>
        </span>
      </button>
      <p className="mt-1.5 text-[11px] text-[var(--ink-soft)]">{modeLine(m)}</p>
      <button onClick={onMessage} className="btn btn-primary btn-sm mt-2 w-full">
        Message
      </button>
    </div>
  );
}

function MemberPanel({ m, onMessage }: { m: CircleMember; onMessage: () => void }) {
  const shared = m.entityIds.map((id) => entityById(id)).filter(Boolean);
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="avatar h-14 w-14 flex-none text-[15px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl(m.name)} alt="" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold leading-tight">{m.name}</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
            {m.headline} · {m.company}
          </p>
          <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">{modeLine(m)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {shared.map((e) => (
          <span key={e!.id} className="pill" style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}>
            {e!.emoji} {e!.name}
          </span>
        ))}
      </div>

      {/* No connection request: you're both vetted members of the same
          community, which is the entire point of a closed network. */}
      <button onClick={onMessage} className="btn btn-primary btn-sm mt-4 w-full">
        Message {m.name.split(" ")[0]}
      </button>
      <p className="mt-2 text-[11.5px] text-[var(--ink-soft)]">
        No request needed — you&rsquo;re both in {shared[0]?.name ?? "this community"}, and that&rsquo;s the introduction.
      </p>
    </div>
  );
}

function PeopleList({
  members,
  total,
  offMapCount,
  query,
  cityFilter,
  cityGroups,
  onQuery,
  onCity,
  onOpen,
}: {
  members: CircleMember[];
  total: number;
  offMapCount: number;
  query: string;
  cityFilter: string | null;
  cityGroups: Array<{ city: { id: string; name: string }; members: CircleMember[] }>;
  onQuery: (q: string) => void;
  onCity: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={`Search ${total} members by name, role or city…`}
        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[12.5px] outline-none focus:border-[var(--brand)]"
      />

      <div className="mt-2 flex flex-wrap gap-1">
        <button
          onClick={() => onCity(null)}
          className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={cityFilter === null ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" } : { color: "var(--ink-soft)" }}
        >
          Everywhere
        </button>
        {cityGroups.slice(0, 10).map((g) => (
          <button
            key={g.city.id}
            onClick={() => onCity(g.city.id)}
            className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
            style={cityFilter === g.city.id ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" } : { color: "var(--ink-soft)" }}
          >
            {g.city.name} <span className="opacity-60">{g.members.length}</span>
          </button>
        ))}
      </div>

      {offMapCount > 0 && (
        <p className="mt-2 text-[11.5px] text-[var(--ink-soft)]">
          {offMapCount} of these {members.length} keep themselves off the map. They&rsquo;re still here, and you can still message them.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-1">
        {members.slice(0, 120).map((m) => (
          <button key={m.id} onClick={() => onOpen(m.id)} className="flex w-full items-center gap-2.5 rounded-2xl p-2 text-left hover:bg-[var(--sunk)]">
            <span className="avatar h-9 w-9 flex-none text-[11px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl(m.name)} alt="" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold leading-tight">{m.name}</span>
              <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                {m.headline} · {m.company}
              </span>
            </span>
            <span className="flex-none text-[10.5px] text-[var(--ink-soft)]">{m.mode === "off" ? "🚫" : m.mode === "live" ? "📍" : "🏙"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EventsList({
  events,
  myCityId,
  onOpen,
  onStart,
}: {
  events: CircleEvent[];
  myCityId: string;
  onOpen: (id: string) => void;
  onStart: () => void;
}) {
  // Your own city first. In a community spread across fifty cities, a
  // chronological list is mostly events you will never attend.
  const here = events.filter((e) => e.cityId === myCityId);
  const online = events.filter((e) => e.kind === "online");
  const elsewhere = events.filter((e) => e.cityId !== myCityId && e.kind !== "online");

  return (
    <div>
      <button onClick={onStart} className="btn btn-primary btn-sm w-full">
        📍 Call a meetup in your city
      </button>
      <p className="mt-1.5 text-[11.5px] text-[var(--ink-soft)]">
        Any member can. It only reaches the people in that city, so there&rsquo;s nothing to approve.
      </p>

      {[
        { label: `In ${cityById(myCityId)?.name ?? "your city"}`, list: here },
        { label: "Online", list: online },
        { label: "Everywhere else", list: elsewhere },
      ].map((group) =>
        group.list.length === 0 ? null : (
          <div key={group.label} className="mt-4">
            <p className="label">{group.label}</p>
            <div className="mt-1.5 flex flex-col gap-2">
              {group.list.map((e) => {
                const beacons = beaconsAt(e).length;
                return (
                  <button key={e.id} onClick={() => onOpen(e.id)} className="card p-3 text-left transition-colors hover:border-[var(--brand)]">
                    {e.liveNow && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
                        <span className="beacon-dot" /> Happening now · {beacons} here
                      </span>
                    )}
                    <p className="mt-0.5 text-[13.5px] font-semibold leading-tight">{e.name}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
                      {e.dateLabel} · {e.timeLabel}
                    </p>
                    <p className="text-[12px] text-[var(--ink-soft)]">
                      {e.kind === "online" ? "🌐 Online" : `${e.venue}, ${cityById(e.cityId ?? "")?.name}`}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--ink-soft)]">
                      {e.kind === "meetup" && (
                        <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                          member meetup
                        </span>
                      )}
                      {attendeesOf(e).length} going →
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function ChatsList({ members, onOpen }: { members: CircleMember[]; onOpen: (id: string) => void }) {
  // Everyone in the community is reachable, so "chats" is the people you've
  // actually got a thread with — seeded here, same as the rest of the mock.
  const threads = members.filter((m) => rnd(`thread-${m.id}`) % 3 !== 0).slice(0, 12);
  return (
    <div className="flex flex-col gap-1">
      <p className="mb-1 text-[11.5px] text-[var(--ink-soft)]">
        Anyone in the community can message anyone else. No requests, no waiting — membership already did that work.
      </p>
      {threads.map((m) => (
        <button key={m.id} onClick={() => onOpen(m.id)} className="flex w-full items-center gap-2.5 rounded-2xl p-2 text-left hover:bg-[var(--sunk)]">
          <span className="avatar h-9 w-9 flex-none text-[11px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl(m.name)} alt="" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold leading-tight">{m.name}</span>
            <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">{cityById(m.cityId)?.name}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** There's no way in except an invite — that's the product, not a gate to work around. */
function NeedsInvite() {
  return (
    <div className="grid min-h-screen place-items-center px-4" style={{ background: "var(--sunk)" }}>
      <div className="card w-full max-w-[460px] p-6 text-center">
        <span className="text-[30px] leading-none">🔒</span>
        <h1 className="mt-2 text-[20px] font-bold leading-tight">Members only</h1>
        <p className="mt-1.5 text-[13px] leading-5 text-[var(--ink-soft)]">
          There&rsquo;s no public side to this map and no way to browse in. You get here through a link an admin shares with their own
          community.
        </p>
        <div className="mt-5 flex flex-col gap-1.5">
          <p className="label">Try one</p>
          {[
            { code: "pgp19", label: "ISB · PGP Class of 2019" },
            { code: "iitb18", label: "IIT Bombay · Class of 2018" },
            { code: "climate", label: "Climate Tech Collective" },
          ].map((i) => (
            <a key={i.code} href={`/join/${i.code}`} className="btn btn-ghost btn-sm">
              {i.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
