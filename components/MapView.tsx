"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
const DEFAULT_RADIUS_KM = 25;

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
};

type ConnState = { status: "connect" | "pending" | "accepted" | "declined"; connectionId: string | null };

function pinIcon(opts: { photoUrl: string | null; initial: string; me?: boolean }) {
  const inner = opts.photoUrl
    ? `<img src="${opts.photoUrl}" alt="" />`
    : `<span>${opts.initial}</span>`;
  const bg = opts.me ? "var(--brand)" : "var(--gold)";
  return L.divIcon({
    className: "",
    html: `<div class="pin ${opts.me ? "pin-me" : ""}" style="background:${bg}">${inner}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -16],
  });
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom() < 10 ? 12 : map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function MapView({
  ownLat,
  ownLng,
  ownName,
  ownPhotoUrl,
}: {
  ownLat: number | null;
  ownLng: number | null;
  ownName: string;
  ownPhotoUrl: string | null;
}) {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    ownLat != null && ownLng != null ? { lat: ownLat, lng: ownLng } : null
  );
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [conn, setConn] = useState<Record<string, ConnState>>({});
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!center) return;
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

  function ActionButton({ p }: { p: Profile }) {
    const state = conn[p.id];
    if (!state || state.status === "connect") {
      return (
        <button onClick={() => connectTo(p.id)} className="btn btn-primary btn-sm w-full">
          Connect
        </button>
      );
    }
    if (state.status === "pending") {
      return (
        <button disabled className="btn btn-ghost btn-sm w-full">
          Request sent
        </button>
      );
    }
    if (state.status === "accepted") {
      return (
        <Link href={state.connectionId ? `/messages/${state.connectionId}` : "/connections"} className="btn btn-primary btn-sm w-full">
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

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <input
            className="input"
            placeholder="Jump to a city or neighbourhood…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {results.length > 0 && (
            <div className="card absolute z-20 mt-1 w-full overflow-hidden p-1">
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
        <button onClick={useMyLocation} disabled={locating} className="btn btn-ghost btn-sm">
          {locating ? "Locating…" : "Use my location"}
        </button>
        <div className="flex items-center gap-1.5">
          {RADIUS_OPTIONS_KM.map((km) => (
            <button
              key={km}
              onClick={() => setRadiusKm(km)}
              className="btn btn-sm"
              style={
                radiusKm === km
                  ? { background: "var(--brand)", color: "#fff" }
                  : { background: "var(--sunk)", color: "var(--ink-soft)" }
              }
            >
              {km}km
            </button>
          ))}
        </div>
      </div>

      {!center ? (
        <div className="card p-10 text-center">
          <p className="text-[14px] text-[var(--ink-soft)]">
            Search a place above or use your location to see who&apos;s nearby.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="map-wrap h-[480px] lg:h-[560px]">
            <MapContainer center={[center.lat, center.lng]} zoom={12} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Recenter lat={center.lat} lng={center.lng} />
              {ownLat != null && ownLng != null && (
                <Marker position={[ownLat, ownLng]} icon={pinIcon({ photoUrl: ownPhotoUrl, initial: ownName.slice(0, 1).toUpperCase(), me: true })}>
                  <Popup>
                    <div className="p-3 text-[13px] font-semibold">You</div>
                  </Popup>
                </Marker>
              )}
              {profiles.map((p) => (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lng]}
                  icon={pinIcon({ photoUrl: p.photoUrl, initial: p.name.slice(0, 1).toUpperCase() })}
                >
                  <Popup>
                    <div className="w-56 p-3">
                      <p className="text-[14px] font-semibold">{p.name}</p>
                      {p.headline && <p className="text-[12.5px] text-[var(--ink-soft)]">{p.headline}</p>}
                      {p.company && <p className="text-[12px] text-[var(--ink-soft)]">{p.company}</p>}
                      <p className="mt-1 text-[11.5px] text-[var(--ink-soft)]">
                        ~{p.distanceKm.toFixed(1)}km away
                      </p>
                      <div className="mt-2.5">
                        <ActionButton p={p} />
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="flex max-h-[560px] flex-col gap-3 overflow-y-auto">
            {loading && <p className="text-[13px] text-[var(--ink-soft)]">Loading nearby people…</p>}
            {!loading && profiles.length === 0 && (
              <p className="card p-5 text-[13px] text-[var(--ink-soft)]">
                No one visible within {radiusKm}km yet. Try a wider radius.
              </p>
            )}
            {profiles.map((p) => (
              <div key={p.id} className="card flex gap-3 p-4">
                <span
                  className="avatar h-11 w-11 text-[13px]"
                  style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
                >
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoUrl} alt="" />
                  ) : (
                    p.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold leading-tight">{p.name}</p>
                  {p.headline && <p className="text-[12px] text-[var(--ink-soft)]">{p.headline}</p>}
                  <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">~{p.distanceKm.toFixed(1)}km</p>
                  {p.skills.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.skills.slice(0, 3).map((s) => (
                        <span key={s} className="skill-tag">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2.5">
                    <ActionButton p={p} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
