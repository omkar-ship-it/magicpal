import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getNearbyProfiles } from "@/lib/profiles";
import { getConnectionStatusMap } from "@/lib/connections";

/**
 * Everyone visible worldwide, nearest-to-`center`-first — no radius limit —
 * each annotated with how they relate to the caller (connected / a pending
 * request either direction / nothing yet). This is the one dataset the "My
 * Network" view needs: it draws arcs to the `connected` subset and renders
 * everyone else as people still worth discovering, in the same request.
 *
 * Open to signed-out visitors like /api/nearby — they just get `none` for
 * everyone, same as a visitor who hasn't made any connections yet.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const centerLat = Number.isFinite(lat) ? lat : 0;
  const centerLng = Number.isFinite(lng) ? lng : 0;

  const profiles = await getNearbyProfiles({ excludeUserId: user?.id, centerLat, centerLng, radiusKm: 0, global: true });
  const statusMap = user ? await getConnectionStatusMap(user.id) : new Map();

  const withStatus = profiles.map((p) => {
    const info = statusMap.get(p.id);
    // The `connections` table's own vocabulary (pending/accepted/declined)
    // isn't what the map wants to draw — it only needs "in your circle",
    // "waiting on an answer", or "nothing yet" (a declined request reads
    // the same as never having asked).
    const connectionStatus = info?.status === "accepted" ? "connected" : info?.status === "pending" ? "pending" : "none";
    return {
      ...p,
      connectionStatus,
      connectionId: info?.connectionId ?? null,
      mine: info?.mine ?? null,
    };
  });

  return NextResponse.json({ profiles: withStatus });
}
