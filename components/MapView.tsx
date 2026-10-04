"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Map, { Marker, Popup, NavigationControl, useControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer } from "@deck.gl/layers";
import { DROP_DURATION_OPTIONS_MIN, DEFAULT_DROP_DURATION_MIN, MAX_DROP_LABEL } from "@/lib/rules";
import FloatingAccountMenu from "./FloatingAccountMenu";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
const DEFAULT_RADIUS_KM = 25;
/** Shown before geolocation resolves (or if it's denied) so the map is never blank. */
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

type Mode = "nearby" | "network";
type Drop = { label: string; expiresAt: string };
type ConnectionStatus = "connected" | "pending" | "none";

type Profile = {
  id: string;
  name: string;
  headline: string | null;
  company: string | null;
  skills: string[];
  photoUrl: string | null;
  locationLabel: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  active: boolean;
  drop: Drop | null;
  /** Only present in "My Network" mode — /api/nearby doesn't compute these. */
  connectionStatus?: ConnectionStatus;
  connectionId?: string | null;
  /** True if *I* sent the pending request; false if they sent it to me. */
  mine?: boolean | null;
};

type ConnState = {
  status: "connect" | "pending" | "accepted" | "declined";
  connectionId: string | null;
  /** A pending request that's waiting on *my* answer, not theirs. */
  incoming?: boolean;
};

function minutesLeft(expiresAt: string, now: number): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 60_000));
}

/** Small distances read naturally to one decimal; continental ones read better rounded with a thousands separator. */
function formatDistance(km: number): string {
  return km < 100 ? `~${km.toFixed(1)}km away` : `~${Math.round(km).toLocaleString()}km away`;
}

function Pin({
  photoUrl,
  initial,
  me,
  active,
  drop,
  highlighted,
  connected,
}: {
  photoUrl: string | null;
  initial: string;
  me?: boolean;
  active?: boolean;
  drop?: boolean;
  highlighted?: boolean;
  /** Already in your network — rendered in the same hue as "you", not the discovery gold. */
  connected?: boolean;
}) {
  const classes = ["pin", me ? "pin-me" : "", drop ? "pin-drop" : active ? "pin-active" : "", highlighted ? "pin-hover" : ""]
    .filter(Boolean)
    .join(" ");
  const bg = drop ? "var(--gold)" : me || connected ? "var(--brand)" : "var(--gold)";
  const size = highlighted ? 46 : 38;
  return (
    <div className={classes} style={{ background: bg, width: size, height: size }}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

function DropBadge({ drop, now }: { drop: Drop; now: number }) {
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "var(--gold)" }}>
      <span className="pulse-dot" style={{ background: "var(--gold)" }} />
      “{drop.label}” · {minutesLeft(drop.expiresAt, now)}m left
    </p>
  );
}

function ActionButton({
  p,
  conn,
  onConnect,
  onRespond,
  canAct,
}: {
  p: Profile;
  conn: ConnState | undefined;
  onConnect: (id: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  canAct: boolean;
}) {
  if (!canAct) {
    return (
      <Link href="/login" className="btn btn-ghost btn-sm w-full">
        Sign in to connect
      </Link>
    );
  }
  if (!conn || conn.status === "connect") {
    return (
      <button onClick={() => onConnect(p.id)} className="btn btn-primary btn-sm w-full">
        Connect
      </button>
    );
  }
  if (conn.status === "pending" && conn.incoming) {
    return (
      <div className="flex gap-1.5">
        <button onClick={() => onRespond(p, false)} className="btn btn-ghost btn-sm flex-1">
          Decline
        </button>
        <button onClick={() => onRespond(p, true)} className="btn btn-primary btn-sm flex-1">
          Accept
        </button>
      </div>
    );
  }
  if (conn.status === "pending") {
    return (
      <button disabled className="btn btn-ghost btn-sm w-full">
        Request sent
      </button>
    );
  }
  if (conn.status === "accepted") {
    return (
      <Link href={conn.connectionId ? `/messages/${conn.connectionId}` : "/connections"} className="btn btn-primary btn-sm w-full">
        Message
      </Link>
    );
  }
  return (
    <button disabled className="btn btn-ghost btn-sm w-full">
      Not connected
    </button>
  );
}

function ProfileListRow({
  p,
  conn,
  hoveredId,
  now,
  canAct,
  onHover,
  onUnhover,
  onConnect,
  onRespond,
}: {
  p: Profile;
  conn: ConnState | undefined;
  hoveredId: string | null;
  now: number;
  canAct: boolean;
  onHover: (id: string) => void;
  onUnhover: (id: string) => void;
  onConnect: (id: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
}) {
  const connected = conn?.status === "accepted";
  return (
    <div
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onUnhover(p.id)}
      className="card flex cursor-pointer gap-3 p-3 transition-colors"
      style={hoveredId === p.id ? { borderColor: "var(--brand)", background: "var(--sunk)" } : undefined}
    >
      <span
        className="avatar h-11 w-11 flex-none text-[13px]"
        style={{ background: `linear-gradient(135deg, ${connected ? "var(--brand)" : "var(--gold)"}, var(--brand-deep))` }}
      >
        {p.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl} alt="" />
        ) : (
          p.name.slice(0, 1).toUpperCase()
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13.5px] font-semibold leading-tight">{p.name}</p>
          {p.active && !p.drop && <span className="pulse-dot flex-none" title="Active recently" />}
          {connected && (
            <span
              className="pill flex-none"
              style={{ background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand-deep)", padding: "1px 7px" }}
            >
              Connected
            </span>
          )}
        </div>
        {p.headline && <p className="truncate text-[12px] text-[var(--ink-soft)]">{p.headline}</p>}
        {p.locationLabel && <p className="truncate text-[11px] text-[var(--ink-soft)]">{p.locationLabel}</p>}
        <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{formatDistance(p.distanceKm)}</p>
        {p.drop && <DropBadge drop={p.drop} now={now} />}
        {p.skills.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {p.skills.slice(0, 3).map((s) => (
              <span key={s} className="skill-tag">
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2">
          <ActionButton p={p} conn={conn} onConnect={onConnect} onRespond={onRespond} canAct={canAct} />
        </div>
      </div>
    </div>
  );
}

function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
    </svg>
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
  const [myDrop, setMyDrop] = useState<Drop | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [dropLabel, setDropLabel] = useState("");
  const [dropDuration, setDropDuration] = useState<number>(DEFAULT_DROP_DURATION_MIN);
  const [dropBusy, setDropBusy] = useState(false);
  const [dropError, setDropError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/light-v11");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapRef>(null);

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
  // loads — this just silently recenters it once geolocation resolves,
  // rather than making anyone wait on a permission dialog before seeing
  // anything, the way a "set your location first" gate would.
  useEffect(() => {
    if ((ownLat != null && ownLng != null) || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    );
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
        if (!cancelled) setProfiles(d.profiles ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [center, radiusKm, mode]);

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
        // Seed real status from the server rather than starting every pin as
        // an unknown "Connect" and only finding out after a click — the
        // whole point of this view is seeing who's already in your circle.
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
      })
      .finally(() => {
        if (!cancelled) setWorldLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, ownLat, ownLng]);

  // Nearby mode flies back to a street-level view of `center`; network mode
  // zooms out and fits every connection (plus your own pin) into frame —
  // the "zoom out to see your whole world" moment is the point of this view.
  useEffect(() => {
    if (mode !== "nearby") return;
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 12, duration: 1200 });
  }, [center, mode]);

  const connectedProfiles = worldProfiles.filter((p) => conn[p.id]?.status === "accepted");

  useEffect(() => {
    if (mode !== "network" || worldLoading) return;
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
  }, [mode, worldLoading, ownLat, ownLng]);

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

  async function connectTo(profileId: string) {
    setConn((c) => ({ ...c, [profileId]: { status: "pending", connectionId: null } }));
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: profileId }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setConn((c) => ({ ...c, [profileId]: { status: data.status, connectionId: null } }));
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
        <div className="flex flex-col gap-2.5">
          {profiles.map((p) => (
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
        <div className="flex flex-col gap-2.5">
          {worldProfiles.map((p) => (
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
            />
          ))}
        </div>
      </>
    );

  const activeData = mode === "nearby" ? profiles : worldProfiles;

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
        onLoad={(e) => e.target.setFog({})}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {arcLayers.length > 0 && <ArcOverlay layers={arcLayers} />}

        {ownLat != null && ownLng != null && (
          <Marker longitude={ownLng} latitude={ownLat} anchor="center">
            <div
              onClick={() => hoverProfile("__me")}
              onMouseEnter={() => hoverProfile("__me")}
              onMouseLeave={() => unhoverProfile("__me")}
            >
              <Pin photoUrl={ownPhotoUrl} initial={ownName.slice(0, 1).toUpperCase()} me drop={Boolean(myDrop)} />
            </div>
            {hoveredId === "__me" && (
              <Popup
                longitude={ownLng}
                latitude={ownLat}
                anchor="top"
                closeButton={false}
                closeOnClick={false}
                offset={22}
                onClose={() => unhoverProfile("__me")}
              >
                <div className="p-3 text-[13px] font-semibold">
                  You
                  {myDrop && <DropBadge drop={myDrop} now={now} />}
                </div>
              </Popup>
            )}
          </Marker>
        )}

        {activeData.map((p) => {
          const connected = mode === "network" && conn[p.id]?.status === "accepted";
          return (
            <Marker key={p.id} longitude={p.lng} latitude={p.lat} anchor="center">
              <div onClick={() => hoverProfile(p.id)} onMouseEnter={() => hoverProfile(p.id)} onMouseLeave={() => unhoverProfile(p.id)}>
                <Pin
                  photoUrl={p.photoUrl}
                  initial={p.name.slice(0, 1).toUpperCase()}
                  active={p.active}
                  drop={Boolean(p.drop)}
                  highlighted={hoveredId === p.id}
                  connected={connected}
                />
              </div>
              {hoveredId === p.id && (
                <Popup
                  longitude={p.lng}
                  latitude={p.lat}
                  anchor="top"
                  closeButton={false}
                  closeOnClick={false}
                  offset={22}
                  onClose={() => unhoverProfile(p.id)}
                >
                  <div className="w-56 p-3">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[14px] font-semibold">{p.name}</p>
                      {connected && (
                        <span className="pill" style={{ background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand-deep)", padding: "1px 7px" }}>
                          Connected
                        </span>
                      )}
                    </div>
                    {p.headline && <p className="text-[12.5px] text-[var(--ink-soft)]">{p.headline}</p>}
                    {p.company && <p className="text-[12px] text-[var(--ink-soft)]">{p.company}</p>}
                    {p.locationLabel && <p className="text-[12px] text-[var(--ink-soft)]">{p.locationLabel}</p>}
                    <p className="mt-1 text-[11.5px] text-[var(--ink-soft)]">{formatDistance(p.distanceKm)}</p>
                    {p.drop && <DropBadge drop={p.drop} now={now} />}
                    {p.skills.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.skills.slice(0, 4).map((s) => (
                          <span key={s} className="skill-tag">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2.5">
                      <ActionButton p={p} conn={conn[p.id]} onConnect={connectTo} onRespond={respondTo} canAct={canAct} />
                    </div>
                  </div>
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
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--brand)" }} />
                    connected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--gold)" }} />
                    not yet
                  </span>
                </span>
              </div>
            )}

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
          <div
            className="pointer-events-auto hidden max-h-[calc(100vh-220px)] w-[360px] overflow-y-auto rounded-2xl border border-[var(--line)] p-3 lg:block"
            style={{ background: "var(--bg)", boxShadow: "var(--shadow-lift)" }}
          >
            {listBody}
          </div>
        </div>

        <div className="pointer-events-auto">
          <FloatingAccountMenu isSignedIn={isSignedIn} canAct={canAct} name={ownName} photoUrl={ownPhotoUrl} />
        </div>
      </div>

      {/* Mobile only — bottom sheet, pinned to the viewport regardless of the toolbar's height. */}
      <div className="floating-list lg:hidden">{listBody}</div>
    </div>
  );
}
