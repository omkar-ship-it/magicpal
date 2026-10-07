"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Aliased: the default export is named `Map`, which would shadow the global.
import MapGL, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Avatar from "./Avatar";
import MemberHoverCard from "./MemberHoverCard";
import MemberProfile from "./MemberProfile";
import BookTime, { type Booking } from "./BookTime";
import { entityById } from "@/lib/networks";
import {
  ALL_CIRCLE_EVENTS,
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
  ROLE_GROUPS,
  commonGround,
  relevance,
  timeOfferFor,
  causeById,
  formatAmount,
  rnd,
  type CircleEvent,
  type CircleMember,
  type LocationMode,
} from "@/lib/circleData";
import { clearMe, getMe, setMe, type CircleMe, type Variant } from "@/lib/circleMe";
import type { MockMessage } from "@/lib/chatData";
import FloatingPage, { type PageSize } from "./FloatingPage";
import ChatWindow from "./ChatWindow";
import CircleEventPanel from "./CircleEventPanel";
import CircleYouPanel from "./CircleYouPanel";
import CircleFeed, { EVERYTHING } from "./CircleFeed";
import CircleMeetupForm from "./CircleMeetupForm";
import CircleDigest from "./CircleDigest";
import CircleWelcome, { takeJustJoined } from "./CircleWelcome";
import OpenJoin from "./OpenJoin";
import {
  IconCalendar,
  IconChat,
  IconChevronDown,
  IconClock,
  IconFeed,
  IconGlobe,
  IconHidden,
  IconCity,
  IconLock,
  IconPeople,
  IconPin,
  IconPlus,
} from "./Icons";

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
export default function CircleMap({ variant = "circle" }: { variant?: Variant }) {
  const isOpen = variant === "open";
  const mapRef = useRef<MapRef | null>(null);
  const [me, setMeState] = useState<CircleMe | null>(() => getMe(variant));
  const [activeEntityId, setActiveEntityId] = useState<string>(() => getMe(variant)?.entityIds[0] ?? "");
  /** Open network only: coarse role bucket, since membership isn't narrowing anything. */
  const [roleFilter, setRoleFilter] = useState("all");
  /** Sessions you booked this session, shown back on the member and in Chats. */
  const [bookings, setBookings] = useState<Booking[]>([]);
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
  const [digestOff, setDigestOff] = useState(false);
  /** The first fit has to wait for the style to load or it silently does nothing. */
  const [mapReady, setMapReady] = useState(false);
  /** True only on the hop in from the invite — read once so a refresh won't replay it. */
  const [welcoming, setWelcoming] = useState(() => takeJustJoined());
  /** Events you've said you're coming to, this session. */
  const [going, setGoing] = useState<Set<string>>(new Set());

  const view = stack[stack.length - 1] ?? null;
  const entity = entityById(activeEntityId);

  const update = useCallback((patch: Partial<CircleMe>) => {
    setMeState((cur) => {
      if (!cur) return cur;
      const next = { ...cur, ...patch };
      setMe(next, variant);
      return next;
    });
  }, [variant]);

  /**
   * Open network only. Seeded so the demo has all three states on screen
   * rather than an inbox of one pending request: about a fifth of strangers
   * already read as connected.
   */
  function connectStateFor(id: string): "none" | "requested" | "connected" {
    if ((me?.connectedIds ?? []).includes(id)) return "connected";
    if ((me?.requestedIds ?? []).includes(id)) return "requested";
    return rnd(`oc-${id}`) % 100 < 18 ? "connected" : "none";
  }

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
        if (isOpen) {
          if (roleFilter === "book") {
            if (!timeOfferFor(m)) return false;
          } else if (!(ROLE_GROUPS.find((r) => r.id === roleFilter) ?? ROLE_GROUPS[0]).match(m)) {
            return false;
          }
        }
        if (!q) return true;
        return `${m.name} ${m.headline} ${m.company} ${cityById(m.cityId)?.name ?? ""}`.toLowerCase().includes(q);
      }),
    [members, q, cityFilter, isOpen, roleFilter]
  );

  // An online event has no venue, so the map does the thing only it can:
  // it shows where everyone joining from actually is. Same bubbles, different
  // population — which is the picture the panel's copy promises.
  const openEventEarly = openEventId ? ([...myEvents, ...ALL_CIRCLE_EVENTS].find((e) => e.id === openEventId) ?? null) : null;
  const onlineEvent = openEventEarly?.kind === "online" ? openEventEarly : null;
  const base = onlineEvent ? attendeesOf(onlineEvent) : matching;
  // In the open network a list of 1,800 strangers in roster order is
  // unusable; the people with something in common come first.
  const ranked = isOpen && me ? [...base].sort((a, b) => relevance(me, b) - relevance(me, a)) : base;
  const onMap = ranked.filter((m) => m.mode !== "off");
  const offMapCount = ranked.length - onMap.length;
  const liveMembers = onMap.filter((m) => m.mode === "live");
  /**
   * Below this, a city is one bubble; above it, the people sharing live
   * location break out into pins of their own. Drawing both at world zoom
   * put a bubble reading "1" on top of the very pin it was counting.
   */
  const precise = zoom >= PRECISE_ZOOM;
  /** Phone-width: the panel is a bottom sheet, so framing has to allow for it. */
  const narrow = typeof window !== "undefined" && window.innerWidth < 640;

  /** One bubble per city: the coarse, city-level truth about where the community is. */
  const cityGroups = groupByCity(onMap);

  // ── events and beacons ───────────────────────────────────────────────
  /** Events hosted by any community you're in — live ones first. */
  const events = useMemo(() => {
    const mine = new Set([...(me?.entityIds ?? []), activeEntityId]);
    // Membership is the filter in a closed community. Out in the open there
    // is nothing to filter by, so the whole calendar is on show.
    return [...myEvents, ...ALL_CIRCLE_EVENTS]
      .filter((e) => isOpen || mine.has(e.hostEntityId))
      .sort((a, b) => Number(b.liveNow) - Number(a.liveNow) || a.daysAway - b.daysAway);
  }, [me, activeEntityId, myEvents, isOpen]);

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
    if (!map || !mapReady || cityGroups.length === 0 || venueEvent) return;
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
      // A phone has no room beside the map, so the panel's share of the
      // screen comes off the bottom there and off the right on a desktop.
      {
        padding: narrow
          ? { top: 70, bottom: stack.length > 0 ? 180 : 150, left: 24, right: 24 }
          : { top: 80, bottom: 140, left: 60, right: stack.length > 0 ? 480 : 60 },
        duration: welcoming ? 2400 : 1400,
        maxZoom: 5,
      }
    );
    // Re-frames on community or city-filter change only — not on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntityId, cityFilter, mapReady]);

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
  if (!me)
    return isOpen ? (
      <OpenJoin
        onJoined={(next) => {
          setMeState(next);
          setActiveEntityId(next.entityIds[0]);
          setWelcoming(true);
        }}
      />
    ) : (
      <NeedsInvite />
    );

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
    if (v.startsWith("book:")) return `Book ${memberById(v.slice(5))?.name.split(" ")[0] ?? "time"}`;
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
        initialViewState={
          // Arriving: start on your city so the fit below pulls back to the
          // whole class. Returning: just show the class.
          welcoming && cityById(me.cityId)
            ? { longitude: cityById(me.cityId)!.lng, latitude: cityById(me.cityId)!.lat, zoom: 4.2 }
            : { longitude: 30, latitude: 25, zoom: 1.6 }
        }
        onClick={() => setPinned(null)}
        onMove={(e) => setZoom(e.viewState.zoom)}
        onLoad={() => setMapReady(true)}
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
                  className="map-pin grid place-items-center rounded-full font-bold text-white"
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
                <span className="hover-host relative block">
                  <MemberHoverCard m={m} common={isOpen ? commonGround(me, m) : null} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinned(m.id);
                    }}
                    className="map-pin block rounded-full"
                    style={{ padding: 0, boxShadow: "var(--shadow)" }}
                    aria-label={m.name}
                  >
                    <Avatar name={m.name} size={26} ring={2} />
                  </button>
                </span>
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
                <span className="hover-host relative block">
                  <MemberHoverCard m={m} common={isOpen ? commonGround(me, m) : null} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinned(m.id);
                    }}
                    className="beacon-ring map-pin block rounded-full"
                    style={{ padding: 0 }}
                    aria-label={`${m.name} — here now`}
                  >
                    <Avatar name={m.name} size={32} ring={2} />
                  </button>
                </span>
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
                  className={`map-pin grid h-7 w-7 place-items-center rounded-xl${e.liveNow ? " beacon-ring" : ""}`}
                  style={{
                    background: "var(--card)",
                    color: e.kind === "meetup" ? "var(--ink)" : "var(--brand)",
                    border: `2px solid ${e.kind === "meetup" ? "var(--line)" : "var(--brand)"}`,
                    boxShadow: "var(--shadow)",
                  }}
                  title={`${e.name} — ${e.dateLabel}`}
                >
                  {e.kind === "meetup" ? <IconPin size={15} /> : <IconCalendar size={15} />}
                </button>
              </Marker>
            ))}

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

      {/* ── top: what the map is scoped to ── */}
      <div className="float-in pointer-events-none fixed inset-x-0 top-3 z-[1200] flex flex-col items-center gap-1.5 px-3 sm:top-5">
        <div className="pointer-events-auto relative">
          <button
            onClick={() => !isOpen && setSwitcherOpen((v) => !v)}
            className="flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-2xl border border-[var(--line)] py-2 pl-3 pr-2.5"
            style={{ background: "color-mix(in srgb, var(--card) 95%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
          >
            {isOpen ? (
              <IconGlobe size={16} className="flex-none text-[var(--brand)]" />
            ) : (
              <span className="flex-none text-[16px] leading-none">{entity?.emoji}</span>
            )}
            <span className="min-w-0 truncate text-[13px] font-semibold">
              {isOpen ? (
                "Open network"
              ) : (
                <>
                  {/* The full ancestry wrapped onto two lines on a phone and ate
                      the top of the map. Short name there, full name from sm up. */}
                  <span className="sm:hidden">{entity?.name}</span>
                  <span className="hidden sm:inline">{qualifiedName(activeEntityId)}</span>
                </>
              )}
            </span>
            <span className="hidden flex-none text-[11.5px] text-[var(--ink-soft)] sm:inline">
              {onMap.length.toLocaleString()} on the map
              {offMapCount > 0 ? ` · ${offMapCount} off it` : ""}
            </span>
            {!isOpen && me.entityIds.length > 1 && <IconChevronDown size={14} className="flex-none text-[var(--ink-soft)]" />}
          </button>

          {switcherOpen && !isOpen && me.entityIds.length > 1 && (
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
                    className="tap flex w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-[var(--sunk)]"
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

        {/* With no membership narrowing the map, role is the first cut. */}
        {isOpen && !view && (
          <div
            className="pointer-events-auto flex max-w-[calc(100vw-24px)] gap-1 overflow-x-auto rounded-2xl border border-[var(--line)] p-1"
            style={{ background: "color-mix(in srgb, var(--card) 93%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow)", scrollbarWidth: "none" }}
          >
            {[...ROLE_GROUPS, { id: "book", label: "Open to book" }].map((r) => (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className="tap flex-none whitespace-nowrap rounded-xl px-2.5 py-1 text-[11.5px] font-semibold"
                style={roleFilter === r.id ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" } : { color: "var(--ink-soft)" }}
                aria-pressed={roleFilter === r.id}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The map is showing someone else's population — say so, or the count
          in the bar above reads as the community's when it isn't. */}
      {onlineEvent && (
        <div className="pointer-events-none fixed inset-x-0 top-[68px] z-[1200] flex justify-center px-3 sm:top-[76px]">
          <div
            className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-[var(--line)] px-3 py-1.5"
            style={{ background: "color-mix(in srgb, var(--card) 95%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow)" }}
          >
            <IconGlobe size={14} className="flex-none text-[var(--ink-soft)]" />
            <span className="truncate text-[12px] font-semibold">Showing who&rsquo;s joining {onlineEvent.name}</span>
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
      <div className="float-in pointer-events-none fixed inset-x-0 bottom-3 z-[1350] flex justify-center px-3 sm:bottom-4">
        <div
          className="pointer-events-auto flex w-full max-w-[560px] items-center gap-0.5 rounded-3xl border border-[var(--line)] p-1.5 sm:w-auto sm:gap-1"
          style={{ background: "color-mix(in srgb, var(--card) 99%, transparent)", backdropFilter: "blur(16px)", boxShadow: "var(--shadow-lift)" }}
        >
          <BarButton icon={<IconFeed />} label="Feed" on={view === "feed"} onClick={() => open("feed")} />
          <BarButton icon={<IconPeople />} label="People" count={members.length} on={view === "people"} onClick={() => open("people")} />
          <BarButton icon={<IconCalendar />} label="Events" count={events.length} on={view === "events"} onClick={() => open("events")} />
          <BarButton icon={<IconChat />} label="Chats" on={view === "chats" || Boolean(view?.startsWith("chat:"))} onClick={() => open("chats")} />
          <span className="mx-0.5 h-8 w-px flex-none" style={{ background: "var(--line)" }} />
          <button
            onClick={() => open("you")}
            className="relative flex flex-none items-center gap-1.5 rounded-2xl p-1 sm:pr-2.5"
            style={view === "you" ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))" } : undefined}
            title="You — location and communities"
            aria-label="You — location and communities"
          >
            <span className="relative">
              <Avatar name={me.name} photoUrl={me.photoUrl} style={me.avatarStyle} size={32} />
              {/* The label doesn't fit on a phone, so the state rides the
                  avatar as a badge instead of disappearing. */}
              <span
                className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full sm:hidden"
                style={{ background: "var(--card)", color: me.mode === "off" ? "var(--ink-soft)" : "var(--brand)", boxShadow: "0 0 0 1.5px var(--card)" }}
              >
                {me.mode === "off" ? <IconHidden size={10} /> : me.mode === "live" ? <IconPin size={10} /> : <IconCity size={10} />}
              </span>
            </span>
            <span className="hidden text-[11px] font-semibold sm:inline" style={{ color: "var(--ink-soft)" }}>
              {me.mode === "off" ? "Off the map" : me.mode === "live" ? "Live" : "City"}
            </span>
          </button>
        </div>
      </div>

      {welcoming && (
        <CircleWelcome
          name={me.name}
          communityName={entity?.name ?? "your community"}
          emoji={entity?.emoji ?? "🎓"}
          members={members}
          cityId={me.cityId}
          onDone={() => setWelcoming(false)}
        />
      )}

      {!view && !digestOff && !venueEvent && !welcoming && (
        <CircleDigest
          me={me}
          events={events}
          newPostCount={CIRCLE_POSTS.filter((p) => p.minutesAgo < 2880).length}
          onEvent={(id) => push(`event:${id}`)}
          onFeed={() => open("feed")}
          onDismiss={() => setDigestOff(true)}
        />
      )}

      {/* ── one window, whatever's open ── */}
      {view && (
        <FloatingPage
          title={title}
          // Only the community's own badge — chosen by the institution — earns
          // a glyph here. Everything else is chrome and is already labelled.
          emoji={view === "people" ? (entity?.emoji ?? "") : ""}
          canGoBack={stack.length > 1}
          size={panelSize}
          onBack={pop}
          onClose={() => setStack([])}
          onSize={setPanelSize}
        >
          {view === "people" && (
            <PeopleList
              members={isOpen && me ? [...matching].sort((a, b) => relevance(me, b) - relevance(me, a)) : matching}
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
              openNetwork={isOpen}
              onLevel={setFeedLevel}
              onOpenMember={(id) => push(`member:${id}`)}
              onOpenCity={(id) => {
                setCityFilter(null);
                flyToCity(id);
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

          {view === "chats" && (
            <ChatsList
              bookings={bookings}
              members={members}
              communityName={isOpen ? "the open network" : (entity?.name ?? "this community")}
              connectedOnly={isOpen ? (id) => connectStateFor(id) === "connected" : undefined}
              onOpen={(id) => push(`chat:${id}`)}
            />
          )}

          {view === "you" && (
            <CircleYouPanel
              me={me}
              beaconEventName={beaconEvent?.name ?? null}
              onMode={(m: LocationMode) => update({ mode: m })}
              onCity={(id) => update({ cityId: id })}
              onAvatar={(next) => update({ photoUrl: next.photoUrl, avatarStyle: next.style })}
              onField={update}
              openNetwork={isOpen}
              onStopBeacon={() => update({ beaconEventId: null })}
              onOpenCommunity={(id) => {
                setActiveEntityId(id);
                setCityFilter(null);
                open("people");
              }}
              onLeave={() => {
                clearMe(variant);
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
              return (
                <MemberProfile
                  m={m}
                  events={events}
                  connectState={isOpen ? connectStateFor(m.id) : null}
                  common={isOpen ? commonGround(me, m) : null}
                  onConnect={() => update({ requestedIds: [...(me.requestedIds ?? []), m.id] })}
                  onBook={isOpen ? () => push(`book:${m.id}`) : undefined}
                  onMessage={() => push(`chat:${m.id}`)}
                  onOpenEvent={(id) => push(`event:${id}`)}
                  onOpenCity={(id) => {
                    setCityFilter(id);
                    flyToCity(id);
                  }}
                />
              );
            })()}

          {view.startsWith("book:") &&
            (() => {
              const m = memberById(view.slice(5));
              if (!m) return null;
              return (
                <BookTime
                  m={m}
                  onCancel={pop}
                  onDone={(b) => {
                    setBookings((cur) => [b, ...cur]);
                    pop();
                  }}
                />
              );
            })()}

          {view.startsWith("chat:") &&
            (() => {
              const m = memberById(view.slice(5));
              if (!m) return null;
              return (
                <ChatWindow
                  key={m.id}
                  name={m.name}
                  photoUrl={null}
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

function BarButton({
  icon,
  label,
  count,
  on,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      // Fluid rather than fixed: five 72px blocks plus an avatar overflowed a
      // 390px phone, which pushed the first block off the left edge entirely.
      className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 sm:w-[76px] sm:flex-none"
      style={on ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" } : { color: "var(--ink-soft)" }}
      aria-label={count != null ? `${label}, ${count}` : label}
    >
      {icon}
      <span className="w-full truncate text-center text-[10.5px] font-semibold leading-none sm:text-[11px]">
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
        <Avatar name={m.name} size={40} />
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
  commonFor,
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
  /** Open network only: why each stranger might matter. */
  commonFor?: (m: CircleMember) => string | null;
}) {
  return (
    <div>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={`Search ${total} members by name, role or city…`}
        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[12.5px] outline-none focus:border-[var(--brand)]"
      />

      {/* One scrolling row rather than a wrapped block: on a phone these
          chips were taking four rows and pushing every actual person below
          the fold. */}
      <div className="-mx-1 mt-2 flex gap-1 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }}>
        <CityChip label="Everywhere" on={cityFilter === null} onClick={() => onCity(null)} />
        {cityGroups.slice(0, 12).map((g) => (
          <CityChip key={g.city.id} label={g.city.name} count={g.members.length} on={cityFilter === g.city.id} onClick={() => onCity(g.city.id)} />
        ))}
      </div>

      {offMapCount > 0 && (
        <p className="mt-2 text-[11.5px] text-[var(--ink-soft)]">
          {offMapCount} of these {members.length} keep themselves off the map. They&rsquo;re still here, and you can still message them.
        </p>
      )}

      <div className="stagger mt-3 flex flex-col gap-1">
        {members.slice(0, 120).map((m) => (
          <button key={m.id} onClick={() => onOpen(m.id)} className="tap flex w-full items-center gap-2.5 rounded-2xl p-2 text-left hover:bg-[var(--sunk)]">
            <Avatar name={m.name} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold leading-tight">{m.name}</span>
              <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                {m.headline} · {m.company}
              </span>
              {commonFor?.(m) && (
                <span className="block truncate text-[11px] font-semibold" style={{ color: "var(--brand)" }}>
                  {commonFor(m)}
                </span>
              )}
            </span>
            <span className="flex-none text-[var(--ink-soft)]" title={modeLine(m)}>
              {m.mode === "off" ? <IconHidden size={14} /> : m.mode === "live" ? <IconPin size={14} /> : <IconCity size={14} />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CityChip({ label, count, on, onClick }: { label: string; count?: number; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tap flex-none whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold"
      style={
        on
          ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
          : { background: "var(--sunk)", color: "var(--ink-soft)" }
      }
      aria-pressed={on}
    >
      {label}
      {count != null ? <span className="ml-1 opacity-60">{count}</span> : null}
    </button>
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
  // Anything live comes first wherever it is — it's the only group with a
  // deadline. After that, your own city: in a community spread across fifty
  // cities a chronological list is mostly events you will never attend.
  const live = events.filter((e) => e.liveNow);
  const rest = events.filter((e) => !e.liveNow);
  const here = rest.filter((e) => e.cityId === myCityId);
  const online = rest.filter((e) => e.kind === "online");
  const elsewhere = rest.filter((e) => e.cityId !== myCityId && e.kind !== "online");

  return (
    <div>
      <button onClick={onStart} className="btn btn-primary btn-sm flex w-full items-center justify-center gap-1.5">
        <IconPlus size={15} /> Call a meetup in your city
      </button>
      <p className="mt-1.5 text-[11.5px] text-[var(--ink-soft)]">
        Any member can. It only reaches the people in that city, so there&rsquo;s nothing to approve.
      </p>

      {[
        { label: "Happening now", list: live },
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
                  <button key={e.id} onClick={() => onOpen(e.id)} className="tap card p-3 text-left hover:border-[var(--brand)]">
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
                      {e.kind === "online" ? "Online" : `${e.venue}, ${cityById(e.cityId ?? "")?.name}`}
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

function ChatsList({
  bookings,
  members,
  communityName,
  connectedOnly,
  onOpen,
}: {
  /** Time you've booked, which is a conversation that hasn't happened yet. */
  bookings: Booking[];
  members: CircleMember[];
  /** Threaded through so the preview and the opened thread say the same thing. */
  communityName: string;
  /** Open network: only people who accepted you can be in here. */
  connectedOnly?: (id: string) => boolean;
  onOpen: (id: string) => void;
}) {
  // Threads you actually have, with the last thing said in them — a column of
  // bare names reads as a directory, not an inbox.
  const threads = members
    .filter((m) => !connectedOnly || connectedOnly(m.id))
    .map((m) => ({ m, thread: seedThread(m, communityName) }))
    .filter((t) => t.thread.length > 0)
    .slice(0, 14);

  return (
    <div>
      {bookings.length > 0 && (
        <div className="mb-3">
          <p className="label label-icon">
            <IconClock size={13} /> Booked
          </p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {bookings.map((b) => {
              const m = memberById(b.memberId);
              const cause = causeById(b.causeId);
              if (!m) return null;
              return (
                <button key={b.reference} onClick={() => onOpen(m.id)} className="tap card flex items-center gap-2.5 p-2.5 text-left">
                  <Avatar name={m.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold leading-tight">{m.name}</span>
                    <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                      {b.when} · {b.minutes} min
                    </span>
                    <span className="block truncate text-[11px]" style={{ color: "var(--brand)" }}>
                      {formatAmount({ symbol: b.symbol }, b.amount)} to {cause?.name}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="rounded-2xl p-3 text-[12px] leading-4 text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
        {connectedOnly
          ? "Only people who accepted your request. Out here nothing has vouched for either of you, so a first message is asked for."
          : "Anyone in the community can message anyone else. No requests, no waiting — membership already did that work."}
      </p>

      <div className="stagger mt-3 flex flex-col gap-0.5">
        {threads.map(({ m, thread }) => {
          const last = thread[thread.length - 1];
          return (
            <button
              key={m.id}
              onClick={() => onOpen(m.id)}
              className="tap flex w-full items-start gap-2.5 rounded-2xl p-2.5 text-left hover:bg-[var(--sunk)]"
            >
              <span className="relative flex-none">
                <Avatar name={m.name} size={40} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight">{m.name}</span>
                  <span className="flex-none text-[11px] text-[var(--ink-soft)]">{last.timeLabel}</span>
                </span>
                <span className="mt-0.5 block truncate text-[12px] leading-4 text-[var(--ink-soft)]">{last.body}</span>
                <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-soft)]">
                  {m.headline} · {cityById(m.cityId)?.name}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** There's no way in except an invite — that's the product, not a gate to work around. */
function NeedsInvite() {
  return (
    <div className="grid min-h-screen place-items-center px-4" style={{ background: "var(--sunk)" }}>
      <div className="card w-full max-w-[460px] p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
          <IconLock size={22} />
        </span>
        <h1 className="mt-3 text-[20px] font-bold leading-tight">Members only</h1>
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
