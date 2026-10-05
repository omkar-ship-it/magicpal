"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Map, { Marker, Popup, NavigationControl, useControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer } from "@deck.gl/layers";
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
import {
  MOCK_EVENTS,
  MOCK_COMPANIES,
  MOCK_INSTITUTIONS,
  mockGroupsForName,
  myGroups,
  countPeopleAtCompany,
  type MockInstitution,
  type GroupType,
} from "@/lib/prototypeData";
import FloatingAccountMenu from "./FloatingAccountMenu";
import CommunityHub from "./CommunityHub";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
const DEFAULT_RADIUS_KM = 25;
/** Shown before geolocation resolves (or if it's denied) so the map is never blank. */
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

type Mode = "nearby" | "network";

function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
    </svg>
  );
}

function PanelIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16" />
      {open ? <path d="M14 10l-2 2 2 2" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M12 10l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/** Prototype-only popup for a mock institution pin — the one new, genuinely georeferenced layer this round (a campus or an ex-employer's office is a real place; a "community" like Weekend Hikers isn't, so it doesn't get a pin — see CommunityHub). */
function InstitutionCard({ inst, onOpenHub }: { inst: MockInstitution; onOpenHub: (groupId: string) => void }) {
  return (
    <div className="w-60 p-3.5">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
        style={{ background: "color-mix(in srgb, var(--layer-institution) 14%, var(--card))", color: "var(--layer-institution)" }}
      >
        <InstitutionIcon /> {inst.kind === "university" ? "University" : inst.kind === "employer_alumni" ? "Alumni network" : "Institution"}
      </span>
      <p className="mt-1.5 text-[14.5px] font-semibold leading-tight">{inst.name}</p>
      <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{inst.city}</p>
      <button onClick={() => onOpenHub(inst.groupId)} className="btn btn-primary btn-sm mt-3 w-full">
        Open community hub →
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

export default function MapView({
  ownLat,
  ownLng,
  ownName,
  ownPhotoUrl,
  ownVisible,
  canAct,
  isSignedIn,
}: {
  ownLat: number | null;
  ownLng: number | null;
  ownName: string;
  ownPhotoUrl: string | null;
  ownVisible: boolean;
  /** False for a signed-out visitor, or a signed-in person who hasn't finished onboarding. */
  canAct: boolean;
  isSignedIn: boolean;
}) {
  const [mode, setMode] = useState<Mode>("nearby");
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    ownLat != null && ownLng != null ? { lat: ownLat, lng: ownLng } : DEFAULT_CENTER
  );
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [worldProfiles, setWorldProfiles] = useState<Profile[]>([]);
  const [worldLoading, setWorldLoading] = useState(false);
  const [loading, setLoading] = useState(false);
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
  /** Desktop-only — hides the left list panel so the map can have the full width. */
  const [listCollapsed, setListCollapsed] = useState(false);
  // --- Experience prototype only, below: layers + groups are mock/hardcoded
  // (see lib/prototypeData.ts) — no backend behind any of these yet.
  const [showPeopleLayer, setShowPeopleLayer] = useState(true);
  const [showEventsLayer, setShowEventsLayer] = useState(true);
  const [showCompaniesLayer, setShowCompaniesLayer] = useState(true);
  const [showInstitutionsLayer, setShowInstitutionsLayer] = useState(true);
  const [groupFilter, setGroupFilter] = useState<"all" | GroupType>("all");
  const [pinnedExtraId, setPinnedExtraId] = useState<string | null>(null);
  const [hoveredExtraId, setHoveredExtraId] = useState<string | null>(null);
  /**
   * Which community's hub is open — set from an institution pin, the "Open
   * hub" filter button, any group badge chip anywhere in the app, or (as a
   * lazy initializer, so there's no flash of a closed hub before it opens)
   * a `?previewGroup=` deep link from the institutions onboarding walkthrough.
   * `typeof window` guards SSR, where there's no query string to read yet.
   */
  const [hubGroupId, setHubGroupId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("previewGroup")
  );
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

  useEffect(() => {
    if (mode !== "nearby") return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
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
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [center, radiusKm, mode, seedConnFromProfiles]);

  useEffect(() => {
    if (mode !== "network") return;
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
  }, [mode, ownLat, ownLng, seedConnFromProfiles]);

  // Nearby mode flies back to a street-level view of `center`; network mode
  // zooms out and fits every connection (plus your own pin) into frame —
  // the "zoom out to see your whole world" moment is the point of this view.
  useEffect(() => {
    if (mode !== "nearby" || !mapReady) return;
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 12, duration: 1200 });
  }, [center, mode, mapReady]);

  const connectedProfiles = worldProfiles.filter((p) => conn[p.id]?.status === "accepted");

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

  const activeCount = profiles.filter((p) => p.active || p.drop).length;
  const dropCount = profiles.filter((p) => p.drop).length;

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
  // Prototype-only group filter — mockGroupsForName/myGroups are a
  // deterministic client-side guess, not real membership data (see
  // lib/prototypeData.ts). myGroups(ownName) is *your* full affiliation
  // set — your name-derived ones plus anything you've explicitly added on
  // your profile (lets you genuinely be alumni of three different schools
  // at once, not just whatever a single hash would've picked). "Alumni"
  // narrows to the union of every alumni network you're actually in —
  // "view all my alumni members" means everyone from any of your schools,
  // not just one. Falls back to the broad type-wide bucket for anyone
  // without a mock affiliation of their own (e.g. signed out).
  const myAllGroups = myGroups(ownName);
  const myGroupsOfType = (t: GroupType) => myAllGroups.filter((g) => g.type === t);
  const myAlumniNetworks = myGroupsOfType("alumni");
  const groupFiltered = activeData.filter((p) => {
    if (groupFilter === "all") return true;
    const mine = myGroupsOfType(groupFilter);
    if (mine.length > 0) {
      const mineIds = new Set(mine.map((g) => g.id));
      return mockGroupsForName(p.name).some((g) => mineIds.has(g.id));
    }
    return mockGroupsForName(p.name).some((g) => g.type === groupFilter);
  });
  const peopleOnMap = showPeopleLayer ? groupFiltered : [];
  // "Open hub" shortcuts — one per network of the selected type you're
  // actually in, since you might belong to several (three alumni networks,
  // say) and each has its own hub. Falls back to the single group your name
  // alone would resolve to, for anyone without an explicit membership.
  const filterResolvedGroups =
    groupFilter === "all"
      ? []
      : myGroupsOfType(groupFilter).length > 0
        ? myGroupsOfType(groupFilter)
        : mockGroupsForName(ownName)
            .filter((g) => g.type === groupFilter)
            .slice(0, 1);

  // Rendered twice below — as a mobile bottom sheet, and nested directly
  // under the toolbar as a desktop sidebar — so the two responsive layouts
  // don't duplicate the actual list markup, just where it's mounted.
  const listBody =
    mode === "nearby" ? (
      <>
        {loading && profiles.length === 0 && <p className="px-2 py-3 text-[13px] text-[var(--ink-soft)]">Loading nearby people…</p>}
        {!loading && profiles.length === 0 && (
          <p className="px-2 py-3 text-[13px] text-[var(--ink-soft)]">No one visible within {radiusKm}km yet. Try a wider radius.</p>
        )}
        {!loading && profiles.length > 0 && groupFiltered.length === 0 && (
          <p className="px-2 py-3 text-[13px] text-[var(--ink-soft)]">No one nearby matches that filter yet.</p>
        )}
        <div className="flex flex-col gap-2.5">
          {groupFiltered.map((p) => (
            <ProfileListRow
              key={p.id}
              p={p}
              conn={conn[p.id]}
              hoveredId={hoveredId}
              now={now}
              canAct={canAct}
              onHover={hoverProfile}
              onUnhover={unhoverProfile}
              onConnect={connectTo}
              onRespond={respondTo}
              onOpenHub={setHubGroupId}
            />
          ))}
        </div>
      </>
    ) : (
      <>
        {worldLoading && worldProfiles.length === 0 && <p className="px-2 py-3 text-[13px] text-[var(--ink-soft)]">Loading the world…</p>}
        {!worldLoading && worldProfiles.length === 0 && (
          <p className="px-2 py-3 text-[13px] text-[var(--ink-soft)]">No one else has joined yet — check back soon.</p>
        )}
        {!worldLoading && worldProfiles.length > 0 && groupFiltered.length === 0 && (
          <p className="px-2 py-3 text-[13px] text-[var(--ink-soft)]">No one matches that filter yet.</p>
        )}
        <div className="flex flex-col gap-2.5">
          {groupFiltered.map((p) => (
            <ProfileListRow
              key={p.id}
              p={p}
              conn={conn[p.id]}
              hoveredId={hoveredId}
              now={now}
              canAct={canAct}
              onHover={hoverProfile}
              onUnhover={unhoverProfile}
              onConnect={connectTo}
              onRespond={respondTo}
              onOpenHub={setHubGroupId}
            />
          ))}
        </div>
      </>
    );

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
        // deck.gl's view-state sync doesn't yet track Mapbox's experimental
        // "globe" projection correctly — an ArcLayer's geometry projects to
        // the wrong screen position under it, rendering invisibly. The
        // sphere is the better look for free exploration; a flat projection
        // is what actually makes the connection arcs show up correctly.
        projection={mode === "network" ? "mercator" : "globe"}
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
          const status = pinStatusOf(conn[p.id]);
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
                      conn={conn[p.id]}
                      now={now}
                      canAct={canAct}
                      note={notes[p.id] ?? ""}
                      onNoteChange={(v) => setNotes((n) => ({ ...n, [p.id]: v }))}
                      onConnect={connectTo}
                      onRespond={respondTo}
                      onOpenHub={setHubGroupId}
                    />
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}

        {/* Experience-prototype layers — Events, Companies & Institutions
            are mock data (lib/prototypeData.ts), shown only in Nearby mode. */}
        {mode === "nearby" &&
          showEventsLayer &&
          MOCK_EVENTS.map((ev) => {
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
                    <EventCard ev={ev} />
                  </Popup>
                )}
              </Marker>
            );
          })}

        {mode === "nearby" &&
          showCompaniesLayer &&
          MOCK_COMPANIES.map((co) => {
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
                    <CompanyCard co={co} peopleHere={peopleHere} />
                  </Popup>
                )}
              </Marker>
            );
          })}

        {mode === "nearby" &&
          showInstitutionsLayer &&
          MOCK_INSTITUTIONS.map((inst) => {
            const open = hoveredExtraId === inst.id || pinnedExtraId === inst.id;
            return (
              <Marker key={inst.id} longitude={inst.lng} latitude={inst.lat} anchor="center">
                <div
                  className={`layer-pin${open ? " layer-pin-hover" : ""}`}
                  style={{ background: "var(--layer-institution)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedExtraId((cur) => (cur === inst.id ? null : inst.id));
                  }}
                  onMouseEnter={() => setHoveredExtraId(inst.id)}
                  onMouseLeave={() => setHoveredExtraId((cur) => (cur === inst.id ? null : cur))}
                >
                  <InstitutionIcon />
                </div>
                {open && (
                  <Popup
                    longitude={inst.lng}
                    latitude={inst.lat}
                    anchor="top"
                    closeButton={false}
                    closeOnClick={false}
                    offset={20}
                    onClose={() => setPinnedExtraId((cur) => (cur === inst.id ? null : cur))}
                  >
                    <InstitutionCard
                      inst={inst}
                      onOpenHub={(groupId) => {
                        setPinnedExtraId(null);
                        setHubGroupId(groupId);
                      }}
                    />
                  </Popup>
                )}
              </Marker>
            );
          })}
      </Map>

      {/* ---------------------------------------------------- floating chrome */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5">
        <div className="flex w-full max-w-[600px] flex-col gap-3">
          <div className="floating-panel pointer-events-auto p-3">
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 flex-none place-items-center rounded-full text-[15px] text-white"
                style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
              >
                ✦
              </span>

              <div className="flex flex-none items-center gap-0.5 rounded-full p-0.5" style={{ background: "var(--sunk)" }}>
                <button
                  onClick={() => setMode("nearby")}
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  style={mode === "nearby" ? { background: "var(--card)", boxShadow: "var(--shadow)" } : { color: "var(--ink-soft)" }}
                >
                  Nearby
                </button>
                <button
                  onClick={() => setMode("network")}
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  style={mode === "network" ? { background: "var(--card)", boxShadow: "var(--shadow)" } : { color: "var(--ink-soft)" }}
                >
                  My Network
                </button>
              </div>

              {mode === "nearby" && (
                <div className="relative min-w-0 flex-1">
                  <svg
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                  </svg>
                  <input
                    className="input pl-9"
                    placeholder="Search a city or neighbourhood…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {results.length > 0 && (
                    <div className="card absolute z-10 mt-1 w-full overflow-hidden p-1">
                      {results.map((r) => (
                        <button
                          key={`${r.lat},${r.lng}`}
                          type="button"
                          onClick={() => {
                            setCenter({ lat: r.lat, lng: r.lng });
                            setQuery(r.label);
                            setResults([]);
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-[var(--sunk)]"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {mode === "nearby" && (
                <button
                  onClick={useMyLocation}
                  disabled={locating}
                  title="Use my location"
                  className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
                >
                  <TargetIcon />
                </button>
              )}

              <button
                onClick={() => setListCollapsed((c) => !c)}
                title={listCollapsed ? "Show the people list" : "Hide the people list"}
                className="sidebar-collapse-toggle hidden lg:grid"
              >
                <PanelIcon open={!listCollapsed} />
              </button>
            </div>

            {mode === "nearby" ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <select className="chip-select" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
                  {RADIUS_OPTIONS_KM.map((km) => (
                    <option key={km} value={km}>
                      {km} km
                    </option>
                  ))}
                </select>

                {activeCount > 0 && (
                  <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                    <span className="pulse-dot" />
                    {activeCount} active{dropCount > 0 ? ` · ${dropCount} open to chat` : ""}
                  </span>
                )}

                {!canAct ? (
                  <Link href="/login" className="btn btn-primary btn-sm">
                    Sign in to drop a pin ✦
                  </Link>
                ) : ownVisible && ownLat != null ? (
                  myDrop ? (
                    <span className="pill" style={{ background: "color-mix(in srgb, var(--gold) 16%, var(--card))", color: "var(--gold)" }}>
                      🟡 “{myDrop.label}” · {minutesLeft(myDrop.expiresAt, now)}m
                      <button onClick={endDrop} disabled={dropBusy} className="ml-1 font-bold underline">
                        end
                      </button>
                    </span>
                  ) : !dropOpen ? (
                    <button onClick={() => setDropOpen(true)} className="btn btn-primary btn-sm">
                      Drop a pin ✦
                    </button>
                  ) : null
                ) : (
                  <Link href="/profile" className="text-[12px] text-[var(--ink-soft)] underline">
                    Set a location to drop a pin
                  </Link>
                )}
              </div>
            ) : (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                  🌍 {worldProfiles.length} worldwide · {connectedProfiles.length} connected
                </span>
                <span className="flex items-center gap-3 text-[11px] text-[var(--ink-soft)]">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--good)" }} />
                    connected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--pending)" }} />
                    pending
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--status-new)" }} />
                    not yet
                  </span>
                </span>
              </div>
            )}

            {/* Experience prototype — map layers + group filter are mock
                data (lib/prototypeData.ts), not a real feature yet. Layers
                are location-based (nearby only); the group filter and the
                "Open hub" shortcut work in both modes — alumni/communities
                are worldwide things, not nearby ones. */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-2.5">
              {mode === "nearby" && (
                <>
                  <span
                    onClick={() => setShowPeopleLayer((v) => !v)}
                    className="chip-toggle"
                    data-on={showPeopleLayer}
                    style={showPeopleLayer ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" } : undefined}
                  >
                    👤 People
                  </span>
                  <span
                    onClick={() => setShowEventsLayer((v) => !v)}
                    className="chip-toggle"
                    data-on={showEventsLayer}
                    style={showEventsLayer ? { borderColor: "var(--layer-event)", background: "color-mix(in srgb, var(--layer-event) 12%, var(--card))", color: "var(--layer-event)" } : undefined}
                  >
                    <CalendarIcon /> Events
                  </span>
                  <span
                    onClick={() => setShowCompaniesLayer((v) => !v)}
                    className="chip-toggle"
                    data-on={showCompaniesLayer}
                    style={showCompaniesLayer ? { borderColor: "var(--layer-company)", background: "color-mix(in srgb, var(--layer-company) 12%, var(--card))", color: "var(--layer-company)" } : undefined}
                  >
                    <BriefcaseIcon /> Companies
                  </span>
                  <span
                    onClick={() => setShowInstitutionsLayer((v) => !v)}
                    className="chip-toggle"
                    data-on={showInstitutionsLayer}
                    style={
                      showInstitutionsLayer
                        ? { borderColor: "var(--layer-institution)", background: "color-mix(in srgb, var(--layer-institution) 12%, var(--card))", color: "var(--layer-institution)" }
                        : undefined
                    }
                  >
                    <InstitutionIcon /> Institutions
                  </span>
                </>
              )}
              <select
                className="chip-select"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value as "all" | GroupType)}
                title="Filter people by group"
              >
                <option value="all">All people</option>
                <option value="alumni">
                  {myAlumniNetworks.length === 0
                    ? "🎓 Alumni only"
                    : myAlumniNetworks.length === 1
                      ? `🎓 My alumni network — ${myAlumniNetworks[0].name}`
                      : `🎓 My alumni networks — ${myAlumniNetworks.map((g) => g.name).join(", ")}`}
                </option>
                <option value="community">👥 Communities only</option>
                <option value="group">⛺ Groups only</option>
              </select>
              {filterResolvedGroups.map((g) => (
                <button key={g.id} onClick={() => setHubGroupId(g.id)} className="btn btn-ghost btn-sm">
                  {filterResolvedGroups.length > 1 ? `${g.name} →` : "Open hub →"}
                </button>
              ))}
            </div>

            {mode === "nearby" && dropOpen && (
              <form onSubmit={submitDrop} className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-2.5">
                <input
                  className="input min-w-[180px] flex-1"
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
                {dropError && <p className="w-full text-[12px] font-medium text-[var(--warn)]">{dropError}</p>}
              </form>
            )}
          </div>

          {/* Desktop only — nested directly under the toolbar it belongs to,
              not independently positioned with a guessed pixel offset. */}
          {!listCollapsed && (
            <div
              className="pointer-events-auto hidden max-h-[calc(100vh-220px)] w-[360px] overflow-y-auto rounded-2xl border border-[var(--line)] p-3 lg:block"
              style={{ background: "var(--bg)", boxShadow: "var(--shadow-lift)" }}
            >
              {listBody}
            </div>
          )}
        </div>

        <div className="pointer-events-auto">
          <FloatingAccountMenu isSignedIn={isSignedIn} canAct={canAct} name={ownName} photoUrl={ownPhotoUrl} />
        </div>
      </div>

      {/* Mobile only — bottom sheet, pinned to the viewport regardless of the toolbar's height. */}
      <div className="floating-list lg:hidden">{listBody}</div>

      {hubGroupId && (
        <CommunityHub
          groupId={hubGroupId}
          onClose={() => setHubGroupId(null)}
          people={activeData}
          conn={conn}
          onConnect={connectTo}
          onRespond={respondTo}
          canAct={canAct}
          now={now}
        />
      )}
    </div>
  );
}
