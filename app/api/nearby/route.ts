import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getNearbyProfiles } from "@/lib/profiles";
import { attachConnectionStatus } from "@/lib/connections";
import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM } from "@/lib/rules";

/**
 * Deliberately open to signed-out visitors — the product's whole pitch is
 * seeing real nearby people before you commit to signing up, so this can't
 * sit behind a login wall. Signed-in callers get themselves excluded from
 * their own results; everyone else just sees the public, jittered map.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const radiusParam = Number(url.searchParams.get("radiusKm"));
  const radiusKm = (RADIUS_OPTIONS_KM as readonly number[]).includes(radiusParam) ? radiusParam : DEFAULT_RADIUS_KM;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "A map centre is required." }, { status: 400 });
  }

  const profiles = await getNearbyProfiles({ excludeUserId: user?.id, centerLat: lat, centerLng: lng, radiusKm });
  const withStatus = await attachConnectionStatus(profiles, user?.id);
  return NextResponse.json({ profiles: withStatus, radiusKm });
}
