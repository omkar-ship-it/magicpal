"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { DROP_DURATION_OPTIONS_MIN, DEFAULT_DROP_DURATION_MIN, MAX_DROP_LABEL } from "@/lib/rules";
import FloatingAccountMenu from "./FloatingAccountMenu";

const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
const DEFAULT_RADIUS_KM = 25;
/** Shown before geolocation resolves (or if it's denied) so the map is never blank. */
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

type Drop = { label: string; expiresAt: string };

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
};

type ConnState = { status: "connect" | "pending" | "accepted" | "declined"; connectionId: string | null };

function minutesLeft(expiresAt: string, now: number): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 60_000));
}

function pinIcon(opts: {
  photoUrl: string | null;
  initial: string;
  me?: boolean;
  active?: boolean;
  drop?: boolean;
  highlighted?: boolean;
}) {
  const inner = opts.photoUrl ? `<img src="${opts.photoUrl}" alt="" />` : `<span>${opts.initial}</span>`;
  const bg = opts.drop ? "var(--gold)" : opts.me ? "var(--brand)" : "var(--gold)";
  const classes = [
    "pin",
    opts.me ? "pin-me" : "",
    opts.drop ? "pin-drop" : opts.active ? "pin-active" : "",
    opts.highlighted ? "pin-hover" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const size = opts.highlighted ? 46 : 38;
  return L.divIcon({
    className: "",
    html: `<div class="${classes}" style="background:${bg}">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) + 3],
  });
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom() < 10 ? 12 : map.getZoom());
  }, [lat, lng, map]);
  return null;
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
  canAct,
}: {
  p: Profile;
  conn: ConnState | undefined;
  onConnect: (id: string) => void;
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

function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
    </svg>
  );
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
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    ownLat != null && ownLng != null ? { lat: ownLat, lng: ownLng } : DEFAULT_CENTER
  );
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [profiles, setProfiles] = useState<Profile[]>([]);
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
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  // Shared by both the pin itself and its matching row in the list panel —
  // hovering either one highlights the pin and opens its card, the same
  // split-view behaviour map-plus-list products (Airbnb, Google Maps'
  // search results) use to tie a list to the map it's drawn from.
  function hoverProfile(id: string) {
    setHoveredId(id);
    markersRef.current[id]?.openPopup();
  }
  function unhoverProfile(id: string) {
    setHoveredId((h) => (h === id ? null : h));
    markersRef.current[id]?.closePopup();
  }

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
  }, [center, radiusKm]);

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

  const activeCount = profiles.filter((p) => p.active || p.drop).length;
  const dropCount = profiles.filter((p) => p.drop).length;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, OpenStreetMap contributors'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />
        <ZoomControl position="bottomright" />
        <Recenter lat={center.lat} lng={center.lng} />
        {ownLat != null && ownLng != null && (
          <Marker
            position={[ownLat, ownLng]}
            icon={pinIcon({
              photoUrl: ownPhotoUrl,
              initial: ownName.slice(0, 1).toUpperCase(),
              me: true,
              drop: Boolean(myDrop),
            })}
          >
            <Popup autoPan={false}>
              <div className="p-3 text-[13px] font-semibold">
                You
                {myDrop && <DropBadge drop={myDrop} now={now} />}
              </div>
            </Popup>
          </Marker>
        )}
        {profiles.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            ref={(m) => {
              if (m) markersRef.current[p.id] = m;
            }}
            icon={pinIcon({
              photoUrl: p.photoUrl,
              initial: p.name.slice(0, 1).toUpperCase(),
              active: p.active,
              drop: Boolean(p.drop),
              highlighted: hoveredId === p.id,
            })}
            eventHandlers={{
              mouseover: () => hoverProfile(p.id),
              mouseout: () => unhoverProfile(p.id),
            }}
          >
            <Popup autoPan={false}>
              <div className="w-56 p-3">
                <p className="text-[14px] font-semibold">{p.name}</p>
                {p.headline && <p className="text-[12.5px] text-[var(--ink-soft)]">{p.headline}</p>}
                {p.company && <p className="text-[12px] text-[var(--ink-soft)]">{p.company}</p>}
                <p className="mt-1 text-[11.5px] text-[var(--ink-soft)]">~{p.distanceKm.toFixed(1)}km away</p>
                {p.drop && <DropBadge drop={p.drop} now={now} />}
                <div className="mt-2.5">
                  <ActionButton p={p} conn={conn[p.id]} onConnect={connectTo} canAct={canAct} />
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ---------------------------------------------------- floating chrome */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex items-start gap-3 sm:inset-x-5 sm:top-5">
        <div className="floating-panel pointer-events-auto flex-1 p-3">
          <div className="flex items-center gap-2">
            <span
              className="grid h-8 w-8 flex-none place-items-center rounded-full text-[15px] text-white"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
            >
              ✦
            </span>
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
            <button
              onClick={useMyLocation}
              disabled={locating}
              title="Use my location"
              className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <TargetIcon />
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <select
              className="chip-select"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            >
              {RADIUS_OPTIONS_KM.map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>

            <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
              <span className="pulse-dot" />
              {activeCount} active{dropCount > 0 ? ` · ${dropCount} open to chat` : ""}
            </span>

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

          {dropOpen && (
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

        <div className="pointer-events-auto">
          <FloatingAccountMenu isSignedIn={isSignedIn} canAct={canAct} name={ownName} photoUrl={ownPhotoUrl} />
        </div>
      </div>

      {/* ------------------------------------------------- nearby list panel */}
      <div className="floating-list">
        {loading && profiles.length === 0 && (
          <p className="px-2 py-3 text-[13px] text-[var(--ink-soft)]">Loading nearby people…</p>
        )}
        {!loading && profiles.length === 0 && (
          <p className="px-2 py-3 text-[13px] text-[var(--ink-soft)]">No one visible within {radiusKm}km yet. Try a wider radius.</p>
        )}
        <div className="flex flex-col gap-2.5">
          {profiles.map((p) => (
            <div
              key={p.id}
              onMouseEnter={() => hoverProfile(p.id)}
              onMouseLeave={() => unhoverProfile(p.id)}
              className="card flex cursor-pointer gap-3 p-3 transition-colors"
              style={hoveredId === p.id ? { borderColor: "var(--brand)", background: "var(--sunk)" } : undefined}
            >
              <span
                className="avatar h-11 w-11 flex-none text-[13px]"
                style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
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
                </div>
                {p.headline && <p className="truncate text-[12px] text-[var(--ink-soft)]">{p.headline}</p>}
                <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">~{p.distanceKm.toFixed(1)}km</p>
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
                  <ActionButton p={p} conn={conn[p.id]} onConnect={connectTo} canAct={canAct} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
