import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getNearbyProfiles } from "@/lib/profiles";
import { attachConnectionStatus } from "@/lib/connections";

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
  const withStatus = await attachConnectionStatus(profiles, user?.id);
  return NextResponse.json({ profiles: withStatus });
}
