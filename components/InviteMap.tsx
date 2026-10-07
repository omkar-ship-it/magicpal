"use client";

import { useCallback, useMemo } from "react";
import type { MapEvent } from "react-map-gl/mapbox";
// Aliased: the default export is named `Map`, which would shadow the global.
import MapGL, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { cityById, type CircleMember } from "@/lib/circleData";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

/**
 * The class, on the actual map, at the top of the invite.
 *
 * The invite used to promise "your batch, everywhere it ended up" and then
 * show three text pills. This is the promise itself — the thing someone is
 * being asked to join, visible before they've typed anything. Inert on
 * purpose: no panning, no zooming, no interaction to get lost in, because
 * the only job of this screen is the name field below it.
 */
export default function InviteMap({ members }: { members: CircleMember[] }) {
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members) {
      if (m.mode === "off") continue;
      counts.set(m.cityId, (counts.get(m.cityId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ city: cityById(id), count }))
      .filter((g): g is { city: NonNullable<ReturnType<typeof cityById>>; count: number } => Boolean(g.city))
      .sort((a, b) => b.count - a.count);
  }, [members]);

  // Framed to the class rather than to a fixed view, so a narrow phone still
  // shows the whole spread instead of cropping Asia off the right edge.
  const fit = useCallback(
    (e: MapEvent) => {
      if (groups.length === 0) return;
      const lats = groups.map((g) => g.city.lat);
      const lngs = groups.map((g) => g.city.lng);
      e.target.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: { top: 24, bottom: 60, left: 24, right: 24 }, duration: 0, maxZoom: 3 }
      );
    },
    [groups]
  );

  return (
    <div className="invite-map relative h-[220px] w-full overflow-hidden sm:h-[260px]">
      {/* Mapbox attribution has to stay visible, so it moves out from under
          the community badge rather than being hidden. */}
      <style>{`.invite-map .mapboxgl-ctrl-bottom-left{left:auto;right:0;}`}</style>
      <MapGL
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        projection="mercator"
        initialViewState={{ longitude: 20, latitude: 22, zoom: 0.55 }}
        interactive={false}
        attributionControl={false}
        onLoad={fit}
        style={{ width: "100%", height: "100%" }}
      >
        {groups.map((g) => {
          const size = Math.min(34, 13 + Math.sqrt(g.count) * 4);
          return (
            <Marker key={g.city.id} longitude={g.city.lng} latitude={g.city.lat} anchor="center">
              <span
                className="block rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: "color-mix(in srgb, var(--brand) 78%, transparent)",
                  border: "1.5px solid var(--card)",
                }}
              />
            </Marker>
          );
        })}
      </MapGL>

      {/* Fades the map into the card below it so the hero reads as one object. */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
        style={{ background: "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--card) 92%, transparent))" }}
      />
    </div>
  );
}
