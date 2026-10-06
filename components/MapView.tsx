"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, Popup, NavigationControl, useControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer } from "@deck.gl/layers";
import { avatarUrl } from "@/lib/avatar";
import { DROP_DURATION_OPTIONS_MIN, DEFAULT_DROP_DURATION_MIN, MAX_DROP_LABEL } from "@/lib/rules";
import {
  type Profile,
  type ConnState,
  type Drop,
  pinStatusOf,
  minutesLeft,
  Pin,
  DropBadge,
  ProfileCard,
  ProfileListRow,
  CalendarIcon,
  BriefcaseIcon,
  InstitutionIcon,
  EventCard,
  CompanyCard,
} from "./MapPrimitives";
import { MOCK_EVENTS, MOCK_COMPANIES, countPeopleAtCompany } from "@/lib/prototypeData";
import { MOCK_POSTS, type MockPost, type PostKind } from "@/lib/feedData";
import {
  HOME_FEED_ID,
  PLACED_ENTITIES,
  childrenOf,
  entityById,
  descendantIds,
  PUBLIC_ENTITY_ID,
  TOP_NETWORKS,
  ancestorsOf,
  entityIdsForName,
  sharedContextFor,
  expandMembership,
  getMyAdminIds,
  getMyEntityIds,
  getMyPendingIds,
  setMyEntityIds,
  setMyPendingIds,
  type MockEntity,
} from "@/lib/networks";
import { MOCK_ACCEPTED_NAMES, MOCK_INCOMING_REQUESTS, MOCK_THREADS } from "@/lib/chatData";
import FloatingAccountMenu from "./FloatingAccountMenu";
import EntityPanel from "./EntityPanel";
import EventPanel from "./EventPanel";
import CompanyPanel from "./CompanyPanel";
import Compass, { type CompassLine } from "./Compass";
import ScopePill from "./ScopePill";
import DockBar, { type Section } from "./DockBar";
import SectionPopup, { type Chip, type PopupItem } from "./SectionPopup";
import FloatingPage, { type PageSize } from "./FloatingPage";
import UniversalSearch, { type SearchHit } from "./UniversalSearch";
import RequestPanel, { type IncomingRequest } from "./RequestPanel";
import { formatRoute, parseRoute, type MapRoute } from "@/lib/mapRoute";
import YouPanel, { type OwnProfile } from "./YouPanel";
import RealThread from "./RealThread";
import type { CheckoutResult } from "./Checkout";
import ChatWindow from "./ChatWindow";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
const DEFAULT_RADIUS_KM = 25;
/** Shown before geolocation resolves (or if it's denied) so the map is never blank. */
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

type Mode = "nearby" | "network";

/**
 * Role filters, derived from real seeded profile data (headline, company,
 * skills) rather than invented — "founders and investors near me" is the
 * first thing anyone actually wants from a map like this.
 */
const ROLE_FILTERS: Array<{ id: string; label: string; emoji: string; match: (p: Profile) => boolean }> = [
  { id: "all", label: "Everyone", emoji: "🌍", match: () => true },
  {
    id: "founder",
    label: "Founders",
    emoji: "🚀",
    match: (p) => /founder|ceo|co-founder/i.test(`${p.headline ?? ""}`) || /stealth/i.test(`${p.company ?? ""}`),
  },
  {
    id: "investor",
    label: "Investors",
    emoji: "💰",
    match: (p) =>
      /investor|partner|angel|venture|capital/i.test(`${p.headline ?? ""}`) ||
      p.skills.some((s) => /venture|angel|investing/i.test(s)),
  },
  {
    id: "product",
    label: "Product",
    emoji: "📦",
    match: (p) => /product|pm\b/i.test(`${p.headline ?? ""}`) || p.skills.some((s) => /product/i.test(s)),
  },
  {
    id: "engineer",
    label: "Engineers",
    emoji: "⚙️",
    match: (p) => /engineer|cto|infra|platform|developer|devrel/i.test(`${p.headline ?? ""}`),
  },
  { id: "design", label: "Design", emoji: "🎨", match: (p) => /design/i.test(`${p.headline ?? ""}`) || p.skills.some((s) => /design/i.test(s)) },
  { id: "hiring", label: "Hiring", emoji: "📣", match: (p) => p.skills.some((s) => /hiring/i.test(s)) || /hiring/i.test(`${p.bio ?? ""}`) },
];

/** Each dock section keeps its own drill-down stack, so switching sections doesn't lose your place. */
type Stacks = Record<Section, string[]>;
const EMPTY_STACKS: Stacks = { network: [], chats: [], events: [], institutions: [], companies: [] };

/** Pseudo-id for the "people you're connected to" scope — not a node in the tree. */
const MY_NETWORK_ID = "__mynetwork";

/** The popup for any node with a real place — a campus, an office, or a TiE chapter city. Nodes without one are reached from the selector or anyone's profile chips. */
function NetworkCard({ net, onOpen }: { net: MockEntity; onOpen: (id: string) => void }) {
  return (
    <div className="w-60 p-3.5">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
        style={{ background: "color-mix(in srgb, var(--layer-institution) 14%, var(--card))", color: "var(--layer-institution)" }}
      >
        <InstitutionIcon /> {net.label}
      </span>
      <p className="mt-1.5 text-[14.5px] font-semibold leading-tight">{net.name}</p>
      <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
        {net.place?.city} · {net.memberCountMock.toLocaleString()} members
      </p>
      <button onClick={() => onOpen(net.id)} className="btn btn-primary btn-sm mt-3 w-full">
        Open {net.label.toLowerCase()} →
      </button>
    </div>
  );
}

/** Bridges a deck.gl layer set into the Mapbox GL canvas via react-map-gl's useControl. */
function ArcOverlay({ layers }: { layers: ArcLayer[] }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({ interleaved: false, layers }));
  overlay.setProps({ layers });
  return null;
}

/** One of your real accepted connections, as the Chats list needs it. */
type RealConnection = { id: string; name: string; headline: string | null; photoUrl: string | null };

export default function MapView({
  ownId,
  ownLat,
  ownLng,
  ownName,
  ownPhotoUrl,
  ownVisible,
  ownProfile,
  canAct,
  isSignedIn,
}: {
  /** Your user id — needed to tell your own messages apart in a real thread. */
  ownId: string | null;
  ownLat: number | null;
  ownLng: number | null;
  ownName: string;
  ownPhotoUrl: string | null;
  ownVisible: boolean;
  /** Your saved profile, so the You page can open in-world with no extra round trip. */
  ownProfile: OwnProfile | null;
  /** False for a signed-out visitor, or a signed-in person who hasn't finished onboarding. */
  canAct: boolean;
  isSignedIn: boolean;
}) {
  /**
   * Where the URL says we are. MapView is client-only (see MapViewLoader), so
   * there's no server render to mismatch — the hash can seed state directly.
   */
  const [route0] = useState<MapRoute>(() => parseRoute(typeof window === "undefined" ? "" : window.location.hash));
  const [mode, setMode] = useState<Mode>(route0.network || route0.minimised ? "network" : "nearby");
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    ownLat != null && ownLng != null ? { lat: ownLat, lng: ownLng } : DEFAULT_CENTER
  );
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [worldProfiles, setWorldProfiles] = useState<Profile[]>([]);
  const [worldLoading, setWorldLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [conn, setConn] = useState<Record<string, ConnState>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [myDrop, setMyDrop] = useState<Drop | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [dropLabel, setDropLabel] = useState("");
  const [dropDuration, setDropDuration] = useState<number>(DEFAULT_DROP_DURATION_MIN);
  const [dropBusy, setDropBusy] = useState(false);
  const [dropError, setDropError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  /** Click-pinned — stays open through a mouseleave, unlike a hover preview. */
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/light-v11");
  /** react-map-gl's ref only resolves to a real map instance once Mapbox's own "load" event fires — calling flyTo/fitBounds before that is a silent no-op. */
  const [mapReady, setMapReady] = useState(false);
  /** The browser's live GPS/network fix — when available, this is "you", not the saved profile pin. */
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  // --- Experience prototype only, below: layers + groups are mock/hardcoded
  // (see lib/prototypeData.ts) — no backend behind any of these yet.
  // What's on the map follows the open section — exactly one overlay at a
  // time, instead of four toggles parked on screen.
  /** null = the all-encompassing Public Network. Otherwise exactly one network at a time. */
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(route0.network);
  const [myEntityIds, setMyEntityIdsState] = useState<string[]>(() => getMyEntityIds());
  const [panelSize, setPanelSize] = useState<PageSize>("side");
  /** Default state is a bare map: the dock is a single icon and nothing is open — unless the URL says otherwise. */
  const [dockOpen, setDockOpen] = useState(Boolean(route0.section || route0.minimised));
  const [section, setSection] = useState<Section | null>(route0.section);
  const [stacks, setStacks] = useState<Stacks>(() => (route0.section ? { ...EMPTY_STACKS, [route0.section]: route0.path } : EMPTY_STACKS));
  const [searchOpen, setSearchOpen] = useState(false);
  /** "My Network" is a scope in its own right — just the people you're connected to. */
  const [connectionsOnly, setConnectionsOnly] = useState(route0.connectionsOnly);
  const [compassDismissed, setCompassDismissed] = useState(false);
  /** A network page stood down: its scope stays on the map, the page is out of the way. */
  const [minimisedId, setMinimisedId] = useState<string | null>(route0.minimised);
  const [cityFilter, setCityFilter] = useState<string | null>(route0.city);
  /** Per-section search and filter — the same state drives the popup list and the map. */
  const [sectionQuery, setSectionQuery] = useState<Record<Section, string>>({ network: "", chats: "", events: "", institutions: "", companies: "" });
  const [sectionFilter, setSectionFilter] = useState<Record<Section, string>>(() => {
    const base = { network: "mine", chats: "all", events: "all", institutions: "all", companies: "all" };
    return route0.section && route0.filter ? { ...base, [route0.section]: route0.filter } : base;
  });
  const [chatSort, setChatSort] = useState("recent");
  /** Real pending requests from the API, merged with the seeded ones below. */
  const [realRequests, setRealRequests] = useState<IncomingRequest[]>([]);
  /** How you answered each request this session. */
  const [requestVerdict, setRequestVerdict] = useState<Record<string, "in" | "out">>({});
  /** People you accepted this session — they get a thread and a connected pin. */
  const [newlyAccepted, setNewlyAccepted] = useState<string[]>([]);
  /** Your real accepted connections — these open the real message thread, not a mocked one. */
  const [realThreads, setRealThreads] = useState<RealConnection[]>([]);
  /** The You page — opened from the account menu, not a separate route. */
  const [youOpen, setYouOpen] = useState(route0.page === "you");
  /** Paid things you've bought this session — community memberships and event tickets. */
  const [paidMemberships, setPaidMemberships] = useState<Record<string, CheckoutResult>>({});
  const [registrations, setRegistrations] = useState<Record<string, CheckoutResult>>({});

  /** Posts you write this session, on top of the seeded ones. Prototype-only — never leaves the browser. */
  const [myPosts, setMyPosts] = useState<MockPost[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [extraComments, setExtraComments] = useState<Record<string, MockPost["comments"]>>({});
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [myAdminIds] = useState<string[]>(() => getMyAdminIds());
  const [roleFilter, setRoleFilter] = useState("all");
  const [myPendingIds, setMyPendingIdsState] = useState<string[]>(() => getMyPendingIds());
  const [pinnedExtraId, setPinnedExtraId] = useState<string | null>(null);
  const [hoveredExtraId, setHoveredExtraId] = useState<string | null>(null);
  /**
   * The open panel stack — a network pushes on top of the map, a group
   * pushes on top of its network, and closing unwinds back to the bare map.
   * Seeded from a `?previewGroup=` deep link (the institutions walkthrough's
   * closing step) as a lazy initializer, so there's no flash of a closed
   * panel first. `typeof window` guards SSR.
   */
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapRef>(null);

  // Own marker position: prefer the live fix (it's genuinely where you are
  // right now) and fall back to the saved profile location for anyone whose
  // browser hasn't granted location yet.
  const myLat = liveLocation?.lat ?? ownLat;
  const myLng = liveLocation?.lng ?? ownLng;

  // Seed real connection status from the server rather than starting every
  // pin as an unknown "Connect" and only finding out after a click — used
  // by both Nearby and My Network, so "already connected" looks the same
  // and is known up front everywhere the map shows other people.
  const seedConnFromProfiles = useCallback((list: Profile[]) => {
    setConn((c) => {
      const next = { ...c };
      for (const p of list) {
        if (!p.connectionStatus || p.connectionStatus === "none") continue;
        next[p.id] =
          p.connectionStatus === "connected"
            ? { status: "accepted", connectionId: p.connectionId ?? null }
            : { status: "pending", connectionId: p.connectionId ?? null, incoming: p.mine === false };
      }
      return next;
    });
  }, []);

  // The map's own palette follows the system theme too, not just our CSS.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setMapStyle(mq.matches ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!canAct) return;
    fetch("/api/drops")
      .then((r) => r.json())
      .then((d) => setMyDrop(d.drop ?? null))
      .catch(() => {});
  }, [canAct]);

  // The map is already visible (at DEFAULT_CENTER) the instant the page
  // loads, so there's no "waiting on a permission dialog" gate — this just
  // keeps a live fix flowing in and quietly recenters the view the first
  // time one arrives, for anyone with no saved profile location yet.
  //
  // watchPosition, not a one-shot getCurrentPosition: "let it change as my
  // location changes" means an actual live position, the way a map app's
  // own blue dot works, not a single snapshot taken on page load.
  // enableHighAccuracy is deliberately off — this is a networking map, not
  // turn-by-turn navigation, and GPS-grade precision isn't worth the extra
  // battery draw over wifi/cell-tower accuracy.
  useEffect(() => {
    if (!navigator.geolocation) return;
    let gotFirstFix = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLiveLocation(loc);
        if (!gotFirstFix && ownLat == null && ownLng == null) setCenter(loc);
        gotFirstFix = true;
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Your real requests and threads, so the dock is the only place either
  // lives — the /requests and /connections pages are gone.
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    type Row = { id: string; otherName: string | null; otherHeadline: string | null; otherPhotoUrl: string | null; requestNote?: string | null };
    fetch("/api/connections?pending=1")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setRealRequests(
          ((d.incoming ?? []) as Row[]).map((r) => ({
            id: r.id,
            name: r.otherName ?? "Someone",
            headline: r.otherHeadline,
            photoUrl: r.otherPhotoUrl,
            note: r.requestNote ?? null,
            timeLabel: "recently",
            real: true,
          }))
        );
      })
      .catch(() => {});
    fetch("/api/connections?accepted=1")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setRealThreads(
          ((d.connections ?? []) as Row[]).map((r) => ({
            id: r.id,
            name: r.otherName ?? "Someone",
            headline: r.otherHeadline,
            photoUrl: r.otherPhotoUrl,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (mode !== "nearby") return;
    let cancelled = false;
    Promise.resolve().then(() => {
    });
    fetch(`/api/nearby?lat=${center.lat}&lng=${center.lng}&radiusKm=${radiusKm}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list: Profile[] = d.profiles ?? [];
        setProfiles(list);
        seedConnFromProfiles(list);
      })
      .finally(() => {
      });
    return () => {
      cancelled = true;
    };
  }, [center, radiusKm, mode, seedConnFromProfiles]);

  // Also fetched when a Community Hub is open, even while browsing Nearby —
  // "view the alumni all over the world" needs the actual worldwide roster,
  // not whatever happens to be within the current street-level radius.
  useEffect(() => {
    if (mode !== "network" && !section) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setWorldLoading(true);
    });
    const qs = ownLat != null && ownLng != null ? `?lat=${ownLat}&lng=${ownLng}` : "";
    fetch(`/api/world${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list: Profile[] = d.profiles ?? [];
        setWorldProfiles(list);
        seedConnFromProfiles(list);
      })
      .finally(() => {
        if (!cancelled) setWorldLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, section, ownLat, ownLng, seedConnFromProfiles]);

  // Nearby mode flies back to a street-level view of `center`; network mode
  // zooms out and fits every connection (plus your own pin) into frame —
  // the "zoom out to see your whole world" moment is the point of this view.
  useEffect(() => {
    if (mode !== "nearby" || !mapReady) return;
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 12, duration: 1200 });
  }, [center, mode, mapReady]);

  const connectedProfiles = worldProfiles.filter((p) => conn[p.id]?.status === "accepted");

  /**
   * Frames a set of points. A naive min/max over raw longitudes picks the
   * long way round whenever the set spans the date line (India ↔ California
   * is 261° the "normal" way, 99° over the Pacific), so every point is
   * measured as an offset from the first and wrapped into (-180, 180].
   */
  const fitPoints = useCallback((pts: Array<[number, number]>) => {
    const map = mapRef.current;
    if (!map || pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo({ center: pts[0], zoom: 11, duration: 900 });
      return;
    }
    const refLng = pts[0][0];
    const offsets = pts.map((p) => (((p[0] - refLng + 180) % 360 + 360) % 360) - 180);
    const lats = pts.map((p) => p[1]);
    map.fitBounds(
      [
        [refLng + Math.min(...offsets), Math.min(...lats)],
        [refLng + Math.max(...offsets), Math.max(...lats)],
      ],
      { padding: { top: 80, bottom: 220, left: 80, right: 480 }, duration: 1000, maxZoom: 12 }
    );
  }, []);

  useEffect(() => {
    if (mode !== "network" || worldLoading || !mapReady) return;
    const pts: [number, number][] = connectedProfiles.map((p) => [p.lng, p.lat]);
    if (ownLat != null && ownLng != null) pts.push([ownLng, ownLat]);
    if (pts.length === 0) {
      mapRef.current?.flyTo({ center: [0, 20], zoom: 1.3, duration: 1200 });
      return;
    }
    if (pts.length === 1) {
      mapRef.current?.flyTo({ center: pts[0], zoom: 3, duration: 1200 });
      return;
    }
    // A naive min/max over raw longitudes picks the *long* way round the
    // globe whenever the network spans the date line (India <-> California
    // is 261° the "normal" way, 99° going over the Pacific) — framing the
    // wrong hemisphere entirely and pushing real points off-screen.
    // Measuring every point as an offset from "me" and wrapping each one
    // into (-180, 180] finds the actual shortest span every time.
    const refLng = ownLng ?? pts[0][0];
    const offsets = pts.map((p) => (((p[0] - refLng + 180) % 360 + 360) % 360) - 180);
    const lats = pts.map((p) => p[1]);
    mapRef.current?.fitBounds(
      [
        [refLng + Math.min(...offsets), Math.min(...lats)],
        [refLng + Math.max(...offsets), Math.max(...lats)],
      ],
      { padding: 120, duration: 1500, maxZoom: 4 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, worldLoading, ownLat, ownLng, mapReady]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      Promise.resolve().then(() => setResults([]));
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    }, 400);
  }, [query]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  async function connectTo(profileId: string, note?: string) {
    setConn((c) => ({ ...c, [profileId]: { status: "pending", connectionId: null } }));
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: profileId, note }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setConn((c) => ({ ...c, [profileId]: { status: data.status, connectionId: null } }));
    setNotes((n) => ({ ...n, [profileId]: "" }));
    if (data.status === "accepted") {
      const check = await fetch(`/api/connections?with=${profileId}`);
      const info = await check.json();
      setConn((c) => ({ ...c, [profileId]: { status: "accepted", connectionId: info.connectionId } }));
    }
  }

  async function respondTo(p: Profile, accept: boolean) {
    const connectionId = conn[p.id]?.connectionId;
    if (!connectionId) return;
    setConn((c) => ({ ...c, [p.id]: { status: accept ? "accepted" : "declined", connectionId } }));
    await fetch(`/api/connections/${connectionId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
  }

  async function submitDrop(e: React.FormEvent) {
    e.preventDefault();
    setDropBusy(true);
    setDropError("");
    try {
      const res = await fetch("/api/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: dropLabel, durationMinutes: dropDuration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't drop a pin.");
      setMyDrop(data.drop);
      setDropOpen(false);
      setDropLabel("");
    } catch (err) {
      setDropError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDropBusy(false);
    }
  }

  async function endDrop() {
    setDropBusy(true);
    try {
      await fetch("/api/drops", { method: "DELETE" });
      setMyDrop(null);
    } finally {
      setDropBusy(false);
    }
  }

  const hoverProfile = useCallback((id: string) => setHoveredId(id), []);
  const unhoverProfile = useCallback((id: string) => setHoveredId((h) => (h === id ? null : h)), []);
  const togglePin = useCallback((id: string) => setPinnedId((cur) => (cur === id ? null : id)), []);
  const closeCard = useCallback((id: string) => {
    setPinnedId((cur) => (cur === id ? null : cur));
    setHoveredId((cur) => (cur === id ? null : cur));
  }, []);

  const arcLayers =
    mode === "network" && ownLat != null && ownLng != null && connectedProfiles.length > 0
      ? [
          new ArcLayer({
            id: "network-arcs",
            data: connectedProfiles,
            getSourcePosition: () => [ownLng, ownLat],
            getTargetPosition: (d: Profile) => [d.lng, d.lat],
            getSourceColor: [255, 107, 74, 200],
            getTargetColor: [176, 125, 9, 200],
            getWidth: 2,
            greatCircle: true,
          }),
        ]
      : [];

  const activeData = mode === "nearby" ? profiles : worldProfiles;
  // Prototype-only membership (lib/networks.ts) — deterministic from a name
  // hash plus a curated roster, not real data. Selecting a network narrows
  // the map to just that network's people, anywhere in the world; "All
  // networks" is the Public Network — everyone, no membership needed.
  // Selecting a network narrows the map to everyone beneath it — a member of
  // TiE Bangalore counts as a member of TiE Global, so picking the parent
  // shows the whole tree's people.
  const role = ROLE_FILTERS.find((r) => r.id === roleFilter) ?? ROLE_FILTERS[0];
  /**
   * Everything on the map narrows to the selected network's subtree: its
   * people, the events its chapters are hosting, and its own places —
   * selecting TiE Global puts its chapter pins on the map, not a generic
   * institutions layer.
   */
  const scopeIds = selectedNetworkId ? new Set([selectedNetworkId, ...descendantIds(selectedNetworkId)]) : null;

  const networkFiltered = (selectedNetworkId ? activeData.filter((p) => entityIdsForName(p.name).has(selectedNetworkId)) : activeData).filter(
    role.match
  );
  const myMembership = expandMembership(myEntityIds);
  const myNetworks = TOP_NETWORKS.filter((n) => myMembership.has(n.id));

  const cityOf = (p: Profile) => p.locationLabel?.split(",").pop()?.trim() ?? "";

  /** Rough great-circle distance in km — good enough for a "near me" filter. */
  function kmFrom(lat: number, lng: number) {
    const dLat = ((lat - center.lat) * Math.PI) / 180;
    const dLng = ((lng - center.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos((center.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const q = (sec: Section) => sectionQuery[sec].trim().toLowerCase();
  const hit = (...fields: Array<string | null | undefined>) => (needle: string) =>
    !needle || fields.some((f) => (f ?? "").toLowerCase().includes(needle));

  const filteredEvents = MOCK_EVENTS.filter((e) => {
    if (!hit(e.name, e.city, e.venue, entityById(e.hostEntityId ?? "")?.name)(q("events"))) return false;
    const f = sectionFilter.events;
    if (f === "near") return kmFrom(e.lat, e.lng) <= radiusKm;
    if (f === "week") return e.daysAway <= 7;
    if (f === "free") return !e.tickets;
    if (f === "paid") return Boolean(e.tickets);
    if (f === "mine") return Boolean(e.hostEntityId && myMembership.has(e.hostEntityId));
    return true;
  });

  const filteredCompanies = MOCK_COMPANIES.filter((c) => {
    if (!hit(c.name, c.industry, c.city)(q("companies"))) return false;
    const f = sectionFilter.companies;
    if (f === "near") return kmFrom(c.lat, c.lng) <= radiusKm;
    if (f === "hiring") return c.openRoles.length > 0;
    if (f === "all") return true;
    return c.industry === f;
  });

  const filteredPlaces = PLACED_ENTITIES.filter((e) => {
    if (!hit(e.name, e.place?.city, e.label)(q("institutions"))) return false;
    const f = sectionFilter.institutions;
    if (f === "near") return e.place ? kmFrom(e.place.lat, e.place.lng) <= radiusKm : false;
    if (f === "mine") return myMembership.has(e.id);
    if (f === "all") return true;
    return e.label === f;
  });

  const filteredNetworks = (sectionFilter.network === "mine" ? myNetworks : TOP_NETWORKS).filter((n) =>
    hit(n.name, n.blurbMock)(q("network"))
  );

  /**
   * Everyone asking to connect — real pending rows first, then the seeded
   * ones so the inbox demonstrates something for any viewer.
   */
  const incomingRequests: IncomingRequest[] = [
    ...realRequests,
    ...MOCK_INCOMING_REQUESTS.map((r) => ({ ...r, photoUrl: null, real: false })),
  ];
  const openRequests = incomingRequests.filter((r) => !requestVerdict[r.id]);

  /** Seeded connections plus anyone you accepted this session. */
  const acceptedNames = [...MOCK_ACCEPTED_NAMES, ...newlyAccepted];

  /**
   * What's actually waiting on you — open requests plus threads where they
   * spoke last. The dock badge used to be the thread count, which meant it
   * read "6" forever and so meant nothing.
   */
  const attentionCount =
    openRequests.length +
    acceptedNames.filter((n) => {
      const msgs = MOCK_THREADS[n] ?? [];
      return msgs.length > 0 && !msgs[msgs.length - 1].mine;
    }).length;

  const chatPeople = acceptedNames.map((name) => {
    const p = [...worldProfiles, ...profiles].find((x) => x.name === name);
    const msgs = MOCK_THREADS[name] ?? [];
    return { name, p, last: msgs[msgs.length - 1], count: msgs.length };
  })
    .filter((t) => hit(t.name, t.p?.headline, t.last?.body)(q("chats")))
    .filter((t) => (sectionFilter.chats === "unread" ? !t.last?.mine : true))
    .sort((a, b) => (chatSort === "name" ? a.name.localeCompare(b.name) : b.count - a.count));

  const showEventsLayer = section === "events";
  const showCompaniesLayer = section === "companies";
  /**
   * Institution pins belong to the Institutions section, or to a network
   * you've actually selected — picking TiE Global should put its chapters on
   * the map. The Network section with nothing selected is the Public Network,
   * which is about people: drawing the whole tree's places there buried them
   * under seventy chapter pins.
   */
  const institutionPins = section === "institutions" ? filteredPlaces : scopeIds ? PLACED_ENTITIES.filter((e) => scopeIds.has(e.id)) : [];
  const showInstitutionsLayer = (section === "institutions" || section === "network") && institutionPins.length > 0;
  // The Chats section puts whoever the list is showing on the map — the people
  // you talk to, or, on the Requests tab, the people waiting on you.
  const chatNames =
    sectionFilter.chats === "requests"
      ? new Set(incomingRequests.map((r) => r.name))
      : new Set(chatPeople.map((c) => c.name));
  const connectionScoped = connectionsOnly ? networkFiltered.filter((p) => connFor(p)?.status === "accepted") : networkFiltered;
  const cityScoped = cityFilter ? connectionScoped.filter((p) => cityOf(p) === cityFilter) : connectionScoped;
  /** Cities present in the scoped set, biggest first — the location filter is built from who's actually there. */
  const scopedCities = Object.entries(
    connectionScoped.reduce<Record<string, number>>((acc, p) => {
      const c = cityOf(p);
      if (c) acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Opening a section — or filtering one — moves the camera to what it's
  // showing. Without this the pins render correctly but sit on another
  // continent, so clicking Events looks like nothing happened.
  const activeFilter = section ? sectionFilter[section] : "";
  const activeQuery = section ? sectionQuery[section] : "";
  useEffect(() => {
    if (!mapReady || (!section && !minimisedId)) return;
    if (!section && minimisedId) {
      fitPoints(peopleOnMap.map((p) => [p.lng, p.lat] as [number, number]));
      return;
    }
    const pts: Array<[number, number]> =
      section === "events"
        ? filteredEvents.map((e) => [e.lng, e.lat])
        : section === "companies"
          ? filteredCompanies.map((c) => [c.lng, c.lat])
          : section === "institutions"
            ? filteredPlaces.map((e) => [e.place!.lng, e.place!.lat])
            : section === "chats"
              ? peopleOnMap.map((p) => [p.lng, p.lat])
              : selectedNetworkId
                ? [
                    ...PLACED_ENTITIES.filter((e) => scopeIds?.has(e.id)).map((e): [number, number] => [e.place!.lng, e.place!.lat]),
                    ...peopleOnMap.map((p): [number, number] => [p.lng, p.lat]),
                  ]
                : // Public Network and My Network have no places of their own —
                  // frame their people, or the camera keeps whatever view the
                  // network you just left had put it on.
                  peopleOnMap.map((p): [number, number] => [p.lng, p.lat]);
    fitPoints(pts);
    // Re-frames when the section changes or its own filter/search does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, minimisedId, activeFilter, activeQuery, selectedNetworkId, connectionsOnly, cityFilter, mapReady, worldProfiles.length, profiles.length]);
  const peopleOnMap =
    section === "events" || section === "companies"
      ? []
      : section === "chats"
        ? cityScoped.filter((p) => chatNames.has(p.name))
        : cityScoped;

  const stack = section ? stacks[section] : [];

  function openSection(next: Section, id?: string) {
    setDockOpen(true);
    setSection(next);
    if (id) setStacks((cur) => ({ ...cur, [next]: [id] }));
  }

  function pushInSection(id: string) {
    if (!section) return;
    setStacks((cur) => ({ ...cur, [section]: [...cur[section], id] }));
  }

  function popInSection() {
    if (!section) return;
    setStacks((cur) => ({ ...cur, [section]: cur[section].slice(0, -1) }));
  }

  // ── The URL is the back stack ──────────────────────────────────────────
  // Every navigable move writes a history entry, so the browser's own back
  // button unwinds page → list → map, a refresh lands where you left off, and
  // a feed five levels down is a link you can send someone.
  const routeStr = formatRoute({
    page: youOpen ? "you" : null,
    section,
    path: stack,
    filter: section ? sectionFilter[section] : null,
    network: selectedNetworkId,
    city: cityFilter,
    minimised: minimisedId,
    connectionsOnly,
  });
  const lastRoute = useRef(routeStr);
  /** Set while applying a popstate, so we don't push the entry we just popped to. */
  const fromHistory = useRef(false);

  useEffect(() => {
    if (routeStr === lastRoute.current) return;
    lastRoute.current = routeStr;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    window.history.pushState(null, "", routeStr || window.location.pathname);
  }, [routeStr]);

  const applyRoute = useCallback((r: MapRoute) => {
    setYouOpen(r.page === "you");
    setSection(r.section);
    setDockOpen(Boolean(r.section || r.minimised));
    setStacks(r.section ? { ...EMPTY_STACKS, [r.section]: r.path } : EMPTY_STACKS);
    if (r.section && r.filter) setSectionFilter((cur) => ({ ...cur, [r.section!]: r.filter! }));
    setSelectedNetworkId(r.network);
    setCityFilter(r.city);
    setMinimisedId(r.minimised);
    setConnectionsOnly(r.connectionsOnly);
    if (r.network || r.minimised) setMode("network");
  }, []);

  useEffect(() => {
    function onPop() {
      fromHistory.current = true;
      applyRoute(parseRoute(window.location.hash));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applyRoute]);

  /**
   * Everyone this viewer could possibly search — the world roster plus the
   * nearby one, deduped, so a name is findable whichever mode the map is in.
   */
  const searchablePeople = [...worldProfiles, ...profiles].filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i);

  /**
   * One search, five kinds of answer. A person clears the scopes that would
   * hide them and drops their card open; a chapter 74 deep opens its page
   * directly, which is the whole point — nobody should click through five
   * regions to reach TiE Hyderabad.
   */
  function pickSearchHit(h: SearchHit) {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    if (h.kind === "person") {
      const p = searchablePeople.find((x) => x.id === h.id);
      if (!p) return;
      // Drop every scope that could be filtering them off the map.
      setSection(null);
      setMinimisedId(null);
      setSelectedNetworkId(null);
      setCityFilter(null);
      setConnectionsOnly(false);
      setRoleFilter(ROLE_FILTERS[0].id);
      if (!profiles.some((x) => x.id === p.id)) setMode("network");
      mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 11, duration: 1200 });
      setPinnedId(p.id);
      return;
    }
    if (h.kind === "entity") {
      setMinimisedId(null);
      openSection("network", h.id);
      setSelectedNetworkId(h.id);
      setMode("network");
      return;
    }
    if (h.kind === "event") {
      openSection("events", h.id);
      return;
    }
    if (h.kind === "company") {
      openSection("companies", h.id);
      return;
    }
    setSection(null);
    setCenter({ lat: h.lat, lng: h.lng });
  }

  /** Drilling from inside a network page (a chapter, a class) stays in the Network section. */
  const openEntity = (id: string) => (section === "network" ? pushInSection(id) : openSection("network", id));
  const openEntityTab = (id: string) => openSection("network", id);
  const openEvent = (id: string) => openSection("events", id);
  const openCompany = (id: string) => openSection("companies", id);

  /** Joining a node joins its whole ancestry — you can't be in Class of 2019 without being in PGP and ISB. */
  function joinEntity(id: string, paid?: CheckoutResult) {
    const next = Array.from(new Set([...myEntityIds, id]));
    setMyEntityIdsState(next);
    setMyEntityIds(next);
    if (paid) setPaidMemberships((cur) => ({ ...cur, [id]: paid }));
  }

  function leaveEntity(id: string) {
    const next = myEntityIds.filter((x) => x !== id && !ancestorsOf(x).some((a) => a.id === id));
    setMyEntityIdsState(next);
    setMyEntityIds(next);
    setPaidMemberships((cur) => {
      const n = { ...cur };
      delete n[id];
      return n;
    });
    if (selectedNetworkId && !expandMembership(next).has(selectedNetworkId)) setSelectedNetworkId(null);
  }

  function isMemberOf(id: string): boolean {
    return id === PUBLIC_ENTITY_ID || myMembership.has(id);
  }

  function isAdminOf(id: string): boolean {
    return myAdminIds.includes(id);
  }

  /** Approval-gated communities don't let you in on the spot — the request sits with their admins. */
  function requestAccess(id: string) {
    const next = Array.from(new Set([...myPendingIds, id]));
    setMyPendingIdsState(next);
    setMyPendingIds(next);
  }

  /**
   * The aggregated "catch up" feed: everything posted anywhere you're a
   * member or an admin, newest first, each post tagged with where it came
   * from. This is the home feed — the thing you open first.
   */
  function homeFeedPosts(): MockPost[] {
    const mine = new Set([...myMembership, ...myAdminIds, PUBLIC_ENTITY_ID]);
    return [...myPosts, ...MOCK_POSTS].filter((p) => mine.has(p.entityId)).sort((a, b) => a.minutesAgo - b.minutesAgo);
  }

  function addPost(entityId: string, body: string, kind: PostKind = "update") {
    setMyPosts((cur) => [
      {
        id: `my-${Date.now()}`,
        entityId,
        author: ownName || "You",
        authorHeadline: "You",
        kind,
        body,
        minutesAgo: 0,
        likes: 0,
        comments: [],
      },
      ...cur,
    ]);
  }

  function toggleLike(id: string) {
    setLikes((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addComment(id: string, body: string) {
    const text = body.trim();
    if (!text) return;
    const comment = { id: `c-${Date.now()}`, author: ownName || "You", authorHeadline: "You", body: text, minutesAgo: 0 };
    setExtraComments((cur) => ({ ...cur, [id]: [...(cur[id] ?? []), comment] }));
  }

  function castVote(id: string, optionId: string) {
    setVotes((cur) => ({ ...cur, [id]: optionId }));
  }

  function postsFor(entityId: string): MockPost[] {
    if (entityId === HOME_FEED_ID) return homeFeedPosts();
    return [...myPosts.filter((p) => p.entityId === entityId), ...MOCK_POSTS.filter((p) => p.entityId === entityId)].sort(
      (a, b) => a.minutesAgo - b.minutesAgo
    );
  }

  /**
   * A handful of connections are already accepted in the prototype so there's
   * someone to actually talk to. They read as connected everywhere — green
   * pin, "Message" instead of "Connect" — and open the floating chat window
   * rather than the real messages page, since the thread itself is mocked.
   */
  function connFor(p: Profile): ConnState | undefined {
    if (acceptedNames.includes(p.name)) return { status: "accepted", connectionId: null };
    return conn[p.id];
  }

  /**
   * Answering a request in place. A real one goes through the same endpoint
   * the old /requests page used; a seeded one turns into a thread and a
   * connected pin, which is the point of accepting.
   */
  async function respondToRequest(r: IncomingRequest, accept: boolean) {
    setRequestVerdict((cur) => ({ ...cur, [r.id]: accept ? "in" : "out" }));
    if (accept) setNewlyAccepted((cur) => (cur.includes(r.name) ? cur : [...cur, r.name]));
    if (!r.real) return;
    await fetch(`/api/connections/${r.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    }).catch(() => {});
  }

  /** Compact map controls for the Network popup — these change the pins, not just the list. */
  const peopleControls = (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-[var(--line)] pt-2">
      <div className="flex flex-wrap gap-1">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRoleFilter(r.id)}
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors"
            style={
              roleFilter === r.id
                ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
                : { background: "var(--sunk)", color: "var(--ink-soft)" }
            }
          >
            {r.emoji} {r.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <div className="flex flex-none items-center gap-0.5 rounded-full p-0.5" style={{ background: "var(--sunk)" }}>
          {(["nearby", "network"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={mode === m ? { background: "var(--card)", color: "var(--ink)" } : { color: "var(--ink-soft)" }}
            >
              {m === "nearby" ? "Near me" : "Worldwide"}
            </button>
          ))}
        </div>
        {mode === "nearby" && (
          <select className="chip-select" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
            {RADIUS_OPTIONS_KM.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        )}
        <button onClick={useMyLocation} disabled={locating} className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]">
          {locating ? "Locating…" : "Locate me"}
        </button>
        {canAct && ownVisible && ownLat != null && !myDrop && !dropOpen && (
          <button onClick={() => setDropOpen(true)} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: "var(--brand)" }}>
            Drop a pin ✦
          </button>
        )}
      </div>
      {myDrop && (
        <span className="pill w-fit" style={{ background: "color-mix(in srgb, var(--gold) 16%, var(--card))", color: "var(--gold)" }}>
          🟡 “{myDrop.label}” · {minutesLeft(myDrop.expiresAt, now)}m
          <button onClick={endDrop} disabled={dropBusy} className="ml-1 font-bold underline">
            end
          </button>
        </span>
      )}
      {dropOpen && (
        <form onSubmit={submitDrop} className="flex flex-wrap items-center gap-1.5">
          <input
            className="input min-w-[140px] flex-1 text-[12px]"
            placeholder="At Third Wave, open to chat…"
            value={dropLabel}
            onChange={(e) => setDropLabel(e.target.value.slice(0, MAX_DROP_LABEL))}
            autoFocus
            required
          />
          <select className="chip-select" value={dropDuration} onChange={(e) => setDropDuration(Number(e.target.value))}>
            {DROP_DURATION_OPTIONS_MIN.map((m) => (
              <option key={m} value={m}>
                {m}m
              </option>
            ))}
          </select>
          <button type="submit" disabled={dropBusy} className="btn btn-primary btn-sm">
            Go live
          </button>
          <button type="button" onClick={() => setDropOpen(false)} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          {dropError && <p className="w-full text-[11px] font-medium text-[var(--warn)]">{dropError}</p>}
        </form>
      )}
    </div>
  );

  /**
   * The opening answer to "what's true near me right now" — computed from
   * the same data everything else uses, so every line is clickable through
   * to the already-filtered view behind it.
   */
  function compassLines(): CompassLine[] {
    const lines: CompassLine[] = [];
    const jump = (sec: Section, filter?: string) => () => {
      setDockOpen(true);
      setSection(sec);
      if (filter) setSectionFilter((cur) => ({ ...cur, [sec]: filter }));
    };

    const nearbyFromMine = profiles.filter((p) => {
      const theirs = entityIdsForName(p.name);
      return [...myMembership].some((id) => theirs.has(id));
    });
    if (nearbyFromMine.length > 0) {
      const shared = sharedContextFor(nearbyFromMine[0].name);
      lines.push({
        id: "near",
        emoji: "🎓",
        headline: `${nearbyFromMine.length} from your networks within ${radiusKm}km`,
        detail: shared ? `${nearbyFromMine[0].name} and others from ${shared.label}` : "People you already have something in common with",
        onClick: jump("network"),
      });
    }

    const weekInMine = MOCK_EVENTS.filter((e) => e.daysAway <= 7 && e.hostEntityId && myMembership.has(e.hostEntityId));
    if (weekInMine.length > 0) {
      const next = [...weekInMine].sort((a, b) => a.daysAway - b.daysAway)[0];
      lines.push({
        id: "events",
        emoji: "📅",
        headline: `${weekInMine.length} event${weekInMine.length === 1 ? "" : "s"} this week in your networks`,
        detail: `Next: ${next.name} · ${next.dateLabel}`,
        onClick: jump("events", "week"),
      });
    }

    // Requests go first — they're the only thing here with someone waiting on
    // the other end.
    if (openRequests.length > 0) {
      const shared = sharedContextFor(openRequests[0].name);
      lines.push({
        id: "requests",
        emoji: "🤝",
        headline: `${openRequests.length} ${openRequests.length === 1 ? "person wants" : "people want"} to connect`,
        detail: shared ? `${openRequests[0].name} — also in ${shared.label}` : `${openRequests[0].name} and others are waiting on you`,
        onClick: jump("chats", "requests"),
      });
    }

    const waiting = acceptedNames.filter((n) => {
      const msgs = MOCK_THREADS[n] ?? [];
      return msgs.length > 0 && !msgs[msgs.length - 1].mine;
    });
    if (waiting.length > 0) {
      lines.push({
        id: "chats",
        emoji: "💬",
        headline: `${waiting.length} conversation${waiting.length === 1 ? "" : "s"} waiting on you`,
        detail: `${waiting.slice(0, 2).join(", ")}${waiting.length > 2 ? ` and ${waiting.length - 2} more` : ""}`,
        onClick: jump("chats", "unread"),
      });
    }

    const live = profiles.filter((p) => p.drop);
    if (live.length > 0) {
      lines.push({
        id: "live",
        emoji: "✦",
        headline: `${live.length} open to chat right now`,
        detail: live[0].drop ? `“${live[0].drop.label}”` : "Nearby and available",
        onClick: jump("network"),
      });
    }

    return lines;
  }

  /** The popup's rows — the same filtered collections the map is drawing. */
  function popupItems(): PopupItem[] {
    switch (section) {
      case "network": {
        const connected = activeData.filter((p) => connFor(p)?.status === "accepted").length;
        const base: PopupItem[] = q("network")
          ? []
          : [
              { id: HOME_FEED_ID, group: "Feed", emoji: "🏠", title: "Your feed", subtitle: "Everything from every community you're in" },
              {
                id: PUBLIC_ENTITY_ID,
                group: "Everyone",
                emoji: "🌍",
                title: "Public Network",
                subtitle: "Every professional on the map",
                meta: `${activeData.length} visible · no membership needed`,
                active: !connectionsOnly && selectedNetworkId === null,
              },
              {
                id: MY_NETWORK_ID,
                group: "Everyone",
                emoji: "🤝",
                title: "My Network",
                subtitle: "People you're connected to",
                meta: `${connected} connection${connected === 1 ? "" : "s"}`,
                active: connectionsOnly,
              },
            ];
        const mine = filteredNetworks.filter((n) => myMembership.has(n.id));
        const others = filteredNetworks.filter((n) => !myMembership.has(n.id));
        const row = (n: (typeof filteredNetworks)[number], group: string): PopupItem => ({
          id: n.id,
          group,
          emoji: n.emoji,
          title: n.name,
          subtitle: n.blurbMock,
          meta: `${n.memberCountMock.toLocaleString()} members${childrenOf(n.id).length ? ` · ${childrenOf(n.id).length} ${(n.childLabel ?? "groups").toLowerCase()}` : ""}`,
          active: selectedNetworkId === n.id,
        });
        return [
          ...base,
          ...mine.map((n) => row(n, `Networks you're in (${mine.length})`)),
          ...others.map((n) => row(n, `Other networks (${others.length})`)),
        ];
      }
      case "chats": {
        // Your real threads sit above the seeded ones and open the real
        // message view — this is where /connections and /messages went.
        const real: PopupItem[] = realThreads
          .filter((t) => hit(t.name, t.headline)(q("chats")))
          .map((t) => ({
            id: `conn:${t.id}`,
            group: "Your connections",
            photo: t.photoUrl ?? avatarUrl(t.name),
            title: t.name,
            subtitle: t.headline ?? undefined,
            meta: "Open your conversation",
          }));
        if (sectionFilter.chats === "requests") {
          return incomingRequests
            .filter((r) => hit(r.name, r.headline, r.note)(q("chats")))
            .map((r) => {
              const verdict = requestVerdict[r.id];
              const shared = sharedContextFor(r.name);
              return {
                id: `req:${r.id}`,
                photo: r.photoUrl ?? avatarUrl(r.name),
                title: r.name,
                subtitle: r.headline ?? undefined,
                meta: verdict
                  ? verdict === "in"
                    ? "Accepted — you can message them"
                    : "Declined"
                  : shared
                    ? `${shared.emoji} also in ${shared.label} · wants to connect`
                    : `Wants to connect · ${r.timeLabel}`,
              };
            });
        }
        return [
          ...real,
          ...chatPeople.map((t) => ({
            id: t.p?.id ?? t.name,
            group: real.length > 0 ? "Prototype threads" : undefined,
            photo: t.p?.photoUrl ?? avatarUrl(t.name),
            title: t.name,
            subtitle: t.p?.headline ?? undefined,
            meta: t.last ? `${t.last.mine ? "You: " : ""}${t.last.body}` : "Say hello",
          })),
        ];
      }
      case "events":
        return filteredEvents.map((e) => ({
          id: e.id,
          emoji: "📅",
          title: e.name,
          subtitle: `${e.dateLabel} · ${e.city}`,
          meta: `${e.tickets ? `from ${e.tickets[0].priceLabel}` : "free"} · ${e.attendeesMock.toLocaleString()} attending`,
        }));
      case "institutions":
        return filteredPlaces.map((n) => ({
          id: n.id,
          emoji: n.emoji,
          title: n.name,
          subtitle: `${n.label}${n.place ? ` · ${n.place.city}` : ""}`,
          meta: `${n.memberCountMock.toLocaleString()} members`,
        }));
      case "companies":
        return filteredCompanies.map((c) => ({
          id: c.id,
          emoji: "🏢",
          title: c.name,
          subtitle: `${c.industry} · ${c.city}`,
          meta: `${c.sizeLabel} · ${c.openRoles.length} open roles`,
        }));
      default:
        return [];
    }
  }

  function popupChips(): Chip[] {
    switch (section) {
      case "network":
        return [
          { id: "mine", label: `Mine (${myNetworks.length})` },
          { id: "all", label: `All (${TOP_NETWORKS.length})` },
        ];
      case "chats":
        return [
          { id: "all", label: `Chats (${chatPeople.length})` },
          { id: "unread", label: "Waiting on you" },
          { id: "requests", label: openRequests.length > 0 ? `Requests (${openRequests.length})` : "Requests" },
        ];
      case "events":
        return [
          { id: "all", label: "All" },
          { id: "near", label: "Near me" },
          { id: "week", label: "This week" },
          { id: "mine", label: "My networks" },
          { id: "free", label: "Free" },
          { id: "paid", label: "Ticketed" },
        ];
      case "institutions":
        return [
          { id: "all", label: "All" },
          { id: "near", label: "Near me" },
          { id: "mine", label: "Mine" },
          { id: "Chapter", label: "Chapters" },
          { id: "Network", label: "Institutions" },
        ];
      case "companies": {
        const industries = Array.from(new Set(MOCK_COMPANIES.map((c) => c.industry))).slice(0, 3);
        return [
          { id: "all", label: "All" },
          { id: "near", label: "Near me" },
          { id: "hiring", label: "Hiring" },
          ...industries.map((i) => ({ id: i, label: i })),
        ];
      }
      default:
        return [];
    }
  }

  /** Says plainly what the filter is doing to the map underneath. */
  function popupCount(): string {
    switch (section) {
      case "network":
        return `${peopleOnMap.length} on the map`;
      case "chats":
        return sectionFilter.chats === "requests" ? `${openRequests.length} waiting on you` : `${chatPeople.length} on the map`;
      case "events":
        return `${filteredEvents.length} on the map`;
      case "institutions":
        return `${filteredPlaces.length} on the map`;
      case "companies":
        return `${filteredCompanies.length} on the map`;
      default:
        return "";
    }
  }

  function pageTitle(): string {
    const id = stack[stack.length - 1];
    if (!section || !id) return "";
    if (section === "chats") {
      if (id.startsWith("req:")) return incomingRequests.find((r) => `req:${r.id}` === id)?.name ?? "Request";
      if (id.startsWith("conn:")) return realThreads.find((t) => `conn:${t.id}` === id)?.name ?? "Chat";
      return [...worldProfiles, ...profiles].find((x) => x.id === id)?.name ?? "Chat";
    }
    if (section === "events") return MOCK_EVENTS.find((e) => e.id === id)?.name ?? "Event";
    if (section === "companies") return MOCK_COMPANIES.find((c) => c.id === id)?.name ?? "Company";
    if (id === HOME_FEED_ID) return "Your feed";
    if (id === PUBLIC_ENTITY_ID) return "Public Network";
    if (id === MY_NETWORK_ID) return "My Network";
    return entityById(id)?.name ?? "Network";
  }

  function pageEmoji(): string {
    const id = stack[stack.length - 1];
    if (!section || !id) return "";
    if (section === "chats") return id.startsWith("req:") ? "🤝" : "💬";
    if (section === "events") return "📅";
    if (section === "companies") return "🏢";
    if (id === HOME_FEED_ID) return "🏠";
    if (id === PUBLIC_ENTITY_ID) return "🌍";
    if (id === MY_NETWORK_ID) return "🤝";
    return entityById(id)?.emoji ?? "🌐";
  }

  /**
   * Whatever's drilled into within the open section. Every section's detail
   * is one of four pages, so there's one panel and no second window system.
   */
  function sectionDetail() {
    const id = stack[stack.length - 1];
    if (!section || !id) return null;

    if (section === "chats") {
      if (id.startsWith("conn:")) {
        const t = realThreads.find((x) => `conn:${x.id}` === id);
        if (!t || !ownId) return null;
        return <RealThread connectionId={t.id} meId={ownId} otherName={t.name} otherHeadline={t.headline} otherPhotoUrl={t.photoUrl} />;
      }
      if (id.startsWith("req:")) {
        const r = incomingRequests.find((x) => `req:${x.id}` === id);
        if (!r) return null;
        return (
          <RequestPanel
            request={r}
            verdict={requestVerdict[r.id]}
            onRespond={respondToRequest}
            onMessage={(name) => {
              const p = [...worldProfiles, ...profiles].find((x) => x.name === name);
              setSectionFilter((cur) => ({ ...cur, chats: "all" }));
              setStacks((cur) => ({ ...cur, chats: [p?.id ?? name] }));
            }}
          />
        );
      }
      const p = [...worldProfiles, ...profiles].find((x) => x.id === id);
      const name = p?.name ?? incomingRequests.find((r) => r.name === id)?.name ?? id;
      return <ChatWindow key={id} name={p?.name ?? name} photoUrl={p?.photoUrl ?? null} headline={p?.headline ?? null} wide={panelSize !== "side"} />;
    }

    if (section === "events") {
      return (
        <EventPanel
          eventId={id}
          people={worldProfiles}
          wide={panelSize !== "side"}
          onOpenEntity={openEntityTab}
          registration={registrations[id]}
          onRegistered={(eid, r) => setRegistrations((cur) => ({ ...cur, [eid]: r }))}
          conn={panelConn}
          onConnect={connectTo}
          onRespond={respondTo}
          onMessage={openChat}
          canAct={canAct}
          now={now}
        />
      );
    }

    if (section === "companies") {
      return (
        <CompanyPanel
          companyId={id}
          people={worldProfiles}
          wide={panelSize !== "side"}
          conn={panelConn}
          onConnect={connectTo}
          onRespond={respondTo}
          onMessage={openChat}
          onOpenEntity={openEntityTab}
          canAct={canAct}
          now={now}
        />
      );
    }

    if (id === MY_NETWORK_ID) {
      const connections = activeData.filter((p) => connFor(p)?.status === "accepted");
      return (
        <div>
          <span className="text-[26px] leading-none">🤝</span>
          <h2 className="mt-1.5 text-[19px] font-bold leading-tight">My Network</h2>
          <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">People you&apos;re connected to — {connections.length} of them</p>
          <p className="mt-3 text-[13.5px] leading-5">
            The map is showing just these people. Message anyone here, or book a time to talk.
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            {connections.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-soft)]">No connections yet — send a request from anyone&apos;s pin.</p>
            ) : (
              connections.map((p) => (
                <ProfileListRow
                  key={p.id}
                  p={p}
                  conn={connFor(p)}
                  hoveredId={hoveredId}
                  now={now}
                  canAct={canAct}
                  onHover={hoverProfile}
                  onUnhover={unhoverProfile}
                  onConnect={connectTo}
                  onRespond={respondTo}
                  onMessage={openChat}
                  onOpenEntity={openEntity}
                />
              ))
            )}
          </div>
        </div>
      );
    }

    // network and institutions are both nodes in the same tree
    return (
      <EntityPanel
        entityId={id}
        depth={stack.length}
        people={worldProfiles}
        loading={worldLoading && worldProfiles.length === 0}
        posts={postsFor(id)}
        onPost={addPost}
        likes={likes}
        comments={extraComments}
        votes={votes}
        onToggleLike={toggleLike}
        onComment={addComment}
        onVote={castVote}
        isAdmin={isAdminOf(id)}
        isPending={myPendingIds.includes(id)}
        onRequestAccess={requestAccess}
        isMember={isMemberOf(id)}
        membershipTier={paidMemberships[id]}
        onJoin={joinEntity}
        onLeave={leaveEntity}
        onOpen={openEntity}
        onOpenEvent={openEvent}
        onBack={popInSection}
        wide={panelSize !== "side"}
        conn={panelConn}
        onConnect={connectTo}
        onRespond={respondTo}
        onMessage={openChat}
        canAct={canAct}
        now={now}
      />
    );
  }

  /** Connection status for everyone in the loaded roster, keyed by id — what the panels need. */
  const panelConn: Record<string, ConnState> = Object.fromEntries(
    worldProfiles.map((p) => [p.id, connFor(p)]).filter((entry): entry is [string, ConnState] => Boolean(entry[1]))
  );

  function openChat(p: Profile) {
    openSection("chats", p.id);
  }

  // Rendered twice below — as a mobile bottom sheet, and nested directly
  // under the toolbar as a desktop sidebar — so the two responsive layouts
  // don't duplicate the actual list markup, just where it's mounted.
  // Nearby shows the live "you are here" fix; My Network keeps the stable
  // profile/home-base location, since arcs and distances in that view are
  // about your established base, not wherever you happen to be this second.
  const meLat = mode === "nearby" ? myLat : ownLat;
  const meLng = mode === "nearby" ? myLng : ownLng;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 12 }}
        mapStyle={mapStyle}
        // Flat, always. A globe looks good and navigates badly: half the
        // world is behind it, "fit these 84 chapters" framed a sphere edge,
        // and deck.gl's arcs project to the wrong place under it. Location
        // is navigated through the filters, not by spinning a ball.
        projection="mercator"
        style={{ height: "100%", width: "100%" }}
        onLoad={(e) => {
          setMapReady(true);
          e.target.setFog({});
        }}
        onClick={() => setPinnedId(null)}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {arcLayers.length > 0 && <ArcOverlay layers={arcLayers} />}

        {meLat != null && meLng != null && (
          <Marker longitude={meLng} latitude={meLat} anchor="center">
            <div
              onClick={(e) => {
                e.stopPropagation();
                togglePin("__me");
              }}
              onMouseEnter={() => hoverProfile("__me")}
              onMouseLeave={() => unhoverProfile("__me")}
            >
              <Pin photoUrl={ownPhotoUrl} seed={ownName || "me"} me drop={Boolean(myDrop)} />
            </div>
            {(hoveredId === "__me" || pinnedId === "__me") && (
              <Popup
                longitude={meLng}
                latitude={meLat}
                anchor="top"
                closeButton={false}
                closeOnClick={false}
                offset={22}
                onClose={() => closeCard("__me")}
              >
                <div className="p-3 text-[13px] font-semibold">
                  You
                  {mode === "nearby" && liveLocation && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-normal text-[var(--ink-soft)]">
                      <span className="pulse-dot" />
                      Live location
                    </p>
                  )}
                  {myDrop && <DropBadge drop={myDrop} now={now} />}
                </div>
              </Popup>
            )}
          </Marker>
        )}

        {peopleOnMap.map((p) => {
          const status = pinStatusOf(connFor(p));
          const open = hoveredId === p.id || pinnedId === p.id;
          return (
            <Marker key={p.id} longitude={p.lng} latitude={p.lat} anchor="center">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(p.id);
                }}
                onMouseEnter={() => hoverProfile(p.id)}
                onMouseLeave={() => unhoverProfile(p.id)}
              >
                <Pin
                  photoUrl={p.photoUrl}
                  seed={p.id}
                  active={p.active}
                  drop={Boolean(p.drop)}
                  highlighted={open}
                  status={status}
                />
              </div>
              {open && (
                <Popup
                  longitude={p.lng}
                  latitude={p.lat}
                  anchor="top"
                  closeButton={false}
                  closeOnClick={false}
                  offset={22}
                  maxWidth="320px"
                  onClose={() => closeCard(p.id)}
                >
                  <div className="relative">
                    <button
                      onClick={() => closeCard(p.id)}
                      className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-[var(--ink-soft)] hover:bg-[var(--sunk)]"
                      aria-label="Close"
                    >
                      ×
                    </button>
                    <ProfileCard
                      p={p}
                      conn={connFor(p)}
                      now={now}
                      canAct={canAct}
                      note={notes[p.id] ?? ""}
                      onNoteChange={(v) => setNotes((n) => ({ ...n, [p.id]: v }))}
                      onConnect={connectTo}
                      onRespond={respondTo}
                      onOpenEntity={openEntity}
                      onMessage={openChat}
                    />
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}

        {/* Experience-prototype layers — Events, Companies & Institutions
            are mock data (lib/prototypeData.ts), shown only in Nearby mode. */}
        {showEventsLayer &&
          filteredEvents.map((ev) => {
            const open = hoveredExtraId === ev.id || pinnedExtraId === ev.id;
            return (
              <Marker key={ev.id} longitude={ev.lng} latitude={ev.lat} anchor="center">
                <div
                  className={`layer-pin${open ? " layer-pin-hover" : ""}`}
                  style={{ background: "var(--layer-event)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedExtraId((cur) => (cur === ev.id ? null : ev.id));
                  }}
                  onMouseEnter={() => setHoveredExtraId(ev.id)}
                  onMouseLeave={() => setHoveredExtraId((cur) => (cur === ev.id ? null : cur))}
                >
                  <CalendarIcon />
                </div>
                {open && (
                  <Popup
                    longitude={ev.lng}
                    latitude={ev.lat}
                    anchor="top"
                    closeButton={false}
                    closeOnClick={false}
                    offset={20}
                    onClose={() => setPinnedExtraId((cur) => (cur === ev.id ? null : cur))}
                  >
                    <EventCard
                      ev={ev}
                      onOpen={() => {
                        setPinnedExtraId(null);
                        openEvent(ev.id);
                      }}
                    />
                  </Popup>
                )}
              </Marker>
            );
          })}

        {showCompaniesLayer &&
          filteredCompanies.map((co) => {
            const open = hoveredExtraId === co.id || pinnedExtraId === co.id;
            const peopleHere = countPeopleAtCompany(profiles, co.name);
            return (
              <Marker key={co.id} longitude={co.lng} latitude={co.lat} anchor="center">
                <div
                  className={`layer-pin${open ? " layer-pin-hover" : ""}`}
                  style={{ background: "var(--layer-company)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedExtraId((cur) => (cur === co.id ? null : co.id));
                  }}
                  onMouseEnter={() => setHoveredExtraId(co.id)}
                  onMouseLeave={() => setHoveredExtraId((cur) => (cur === co.id ? null : cur))}
                >
                  <BriefcaseIcon />
                </div>
                {open && (
                  <Popup
                    longitude={co.lng}
                    latitude={co.lat}
                    anchor="top"
                    closeButton={false}
                    closeOnClick={false}
                    offset={20}
                    onClose={() => setPinnedExtraId((cur) => (cur === co.id ? null : cur))}
                  >
                    <CompanyCard
                      co={co}
                      peopleHere={peopleHere}
                      onOpen={() => {
                        setPinnedExtraId(null);
                        openCompany(co.id);
                      }}
                    />
                  </Popup>
                )}
              </Marker>
            );
          })}

        {showInstitutionsLayer &&
          institutionPins.map((net) => {
            const open = hoveredExtraId === net.id || pinnedExtraId === net.id;
            const place = net.place!;
            return (
              <Marker key={net.id} longitude={place.lng} latitude={place.lat} anchor="center">
                <div
                  className={`layer-pin${open ? " layer-pin-hover" : ""}`}
                  style={{ background: "var(--layer-institution)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedExtraId((cur) => (cur === net.id ? null : net.id));
                  }}
                  onMouseEnter={() => setHoveredExtraId(net.id)}
                  onMouseLeave={() => setHoveredExtraId((cur) => (cur === net.id ? null : cur))}
                >
                  <InstitutionIcon />
                </div>
                {open && (
                  <Popup
                    longitude={place.lng}
                    latitude={place.lat}
                    anchor="top"
                    closeButton={false}
                    closeOnClick={false}
                    offset={20}
                    onClose={() => setPinnedExtraId((cur) => (cur === net.id ? null : cur))}
                  >
                    <NetworkCard
                      net={net}
                      onOpen={(id) => {
                        setPinnedExtraId(null);
                        openEntity(id);
                      }}
                    />
                  </Popup>
                )}
              </Marker>
            );
          })}
      </Map>

      <div className="pointer-events-none absolute right-3 top-3 z-[1000] sm:right-5 sm:top-5">
        <div className="pointer-events-auto">
          <FloatingAccountMenu
            isSignedIn={isSignedIn}
            canAct={canAct}
            name={ownName}
            photoUrl={ownPhotoUrl}
            attention={openRequests.length}
            onOpenYou={() => setYouOpen(true)}
            onOpenRequests={() => {
              setSectionFilter((cur) => ({ ...cur, chats: "requests" }));
              openSection("chats");
              setStacks((cur) => ({ ...cur, chats: [] }));
            }}
            onOpenChats={() => {
              setSectionFilter((cur) => ({ ...cur, chats: "all" }));
              openSection("chats");
              setStacks((cur) => ({ ...cur, chats: [] }));
            }}
          />
        </div>
      </div>

      <DockBar
        open={dockOpen}
        active={section}
        unread={attentionCount}
        onOpenChange={(v) => {
          setDockOpen(v);
          if (!v) setSection(null);
        }}
        onSelect={(s) => {
          // A dock block is an entry point, not a bookmark — it always lands
          // on the section's list. The scope pill is what takes you back to
          // where you were.
          setSection((cur) => (cur === s ? null : s));
          setStacks((cur) => ({ ...cur, [s]: [] }));
        }}
      />

      <UniversalSearch
        open={searchOpen}
        people={searchablePeople}
        places={results}
        query={query}
        onOpenChange={setSearchOpen}
        onQueryChange={setQuery}
        onPick={pickSearchHit}
      />

      {minimisedId && (
        <ScopePill
          emoji={entityById(minimisedId)?.emoji ?? "🌐"}
          name={entityById(minimisedId)?.name ?? "Network"}
          count={peopleOnMap.length}
          cities={scopedCities}
          activeCity={cityFilter}
          onCity={setCityFilter}
          onRestore={() => {
            setMinimisedId(null);
            setDockOpen(true);
            setSection("network");
            setStacks((cur) => ({ ...cur, network: [minimisedId] }));
          }}
          onClear={() => {
            setMinimisedId(null);
            setSelectedNetworkId(null);
            setCityFilter(null);
          }}
        />
      )}

      {dockOpen && !section && !compassDismissed && !minimisedId && (
        <Compass place={profiles[0]?.locationLabel?.split(",").pop()?.trim() ?? ""} lines={compassLines()} onDismiss={() => setCompassDismissed(true)} />
      )}

      {section && stack.length === 0 && (
        <SectionPopup
          section={section}
          items={popupItems()}
          query={sectionQuery[section]}
          chips={popupChips()}
          activeChip={sectionFilter[section]}
          sorts={section === "chats" ? [{ id: "recent", label: "Recent" }, { id: "name", label: "A–Z" }] : undefined}
          activeSort={chatSort}
          count={popupCount()}
          onQuery={(v) => setSectionQuery((cur) => ({ ...cur, [section]: v }))}
          onChip={(id) => setSectionFilter((cur) => ({ ...cur, [section]: id }))}
          onSort={setChatSort}
          onPick={(id) => {
            if (section === "network") {
              setCityFilter(null);
              setConnectionsOnly(id === MY_NETWORK_ID);
              // A network is a worldwide thing; a radius is a public-map idea.
              // Selecting one widens to the full roster so its cities are real.
              if (id !== PUBLIC_ENTITY_ID && id !== HOME_FEED_ID) setMode("network");
              setSelectedNetworkId(id === PUBLIC_ENTITY_ID || id === HOME_FEED_ID || id === MY_NETWORK_ID ? null : id);
            }
            pushInSection(id);
          }}
          onClose={() => setSection(null)}
          controls={section === "network" ? peopleControls : undefined}
        />
      )}

      {section && stack.length > 0 && (
        <FloatingPage
          title={pageTitle()}
          emoji={pageEmoji()}
          canGoBack
          size={panelSize}
          onBack={popInSection}
          onClose={() => setSection(null)}
          onMinimise={
            section === "network" && selectedNetworkId
              ? () => {
                  setMinimisedId(selectedNetworkId);
                  setSection(null);
                }
              : undefined
          }
          onSize={setPanelSize}
        >
          {sectionDetail()}
        </FloatingPage>
      )}

      {youOpen && (
        <FloatingPage
          title={canAct ? "You" : "Set up your profile"}
          emoji="🙋"
          canGoBack={false}
          size={panelSize === "side" ? "wide" : panelSize}
          onBack={() => setYouOpen(false)}
          onClose={() => setYouOpen(false)}
          onSize={setPanelSize}
        >
          {ownProfile ? (
            <YouPanel profile={ownProfile} onboarded={canAct} />
          ) : (
            // Reachable by link (an old /profile URL, a shared #/you), so it
            // needs an answer rather than an empty page.
            <div className="py-6 text-center">
              <p className="text-[26px] leading-none">🙋</p>
              <p className="mt-2 text-[14px] font-semibold">Sign in to set up your profile</p>
              <p className="mt-1 text-[12.5px] text-[var(--ink-soft)]">The map is open to everyone — being on it takes an account.</p>
              <a href="/login" className="btn btn-primary btn-sm mt-3 inline-block">
                Sign in
              </a>
            </div>
          )}
        </FloatingPage>
      )}
    </div>
  );
}