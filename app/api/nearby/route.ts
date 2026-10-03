import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getNearbyProfiles } from "@/lib/profiles";
import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM } from "@/lib/rules";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!user.onboarded) return NextResponse.json({ error: "Finish your profile first." }, { status: 400 });

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const radiusParam = Number(url.searchParams.get("radiusKm"));
  const radiusKm = (RADIUS_OPTIONS_KM as readonly number[]).includes(radiusParam) ? radiusParam : DEFAULT_RADIUS_KM;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "A map centre is required." }, { status: 400 });
  }

  const profiles = await getNearbyProfiles({ excludeUserId: user.id, centerLat: lat, centerLng: lng, radiusKm });
  return NextResponse.json({ profiles, radiusKm });
}
