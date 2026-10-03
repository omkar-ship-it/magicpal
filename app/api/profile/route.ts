import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { MAX_SKILLS } from "@/lib/rules";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Create or update the signed-in person's own profile — name, headline,
 * company, bio, skills, location, and the map-visibility toggle, all in one
 * route since they're all edited from the same form. There is no "create
 * someone else's profile" path anywhere in this codebase; `getSessionUser`
 * is the only source of whose row this writes to.
 */
export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = str(body?.name, 80);
  const headline = str(body?.headline, 120);
  const company = str(body?.company, 120);
  const bio = str(body?.bio, 600);
  const locationLabel = str(body?.locationLabel, 160);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const visibleOnMap = Boolean(body?.visibleOnMap);
  const skills = Array.isArray(body?.skills)
    ? body.skills.filter((s: unknown) => typeof s === "string" && s.trim()).map((s: string) => s.trim().slice(0, 30)).slice(0, MAX_SKILLS)
    : [];

  if (name.length < 2) return NextResponse.json({ error: "Tell us your name." }, { status: 400 });
  if (headline.length < 2) return NextResponse.json({ error: "Add a one-line headline." }, { status: 400 });

  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng) && locationLabel.length > 0;

  await db
    .update(users)
    .set({
      name,
      headline,
      company: company || null,
      bio: bio || null,
      skills,
      // A location is only ever set here from a geocoded search result, so
      // a request with no valid location just leaves whatever was there —
      // it never wipes an existing pin to null.
      ...(hasLocation ? { lat, lng, locationLabel } : {}),
      // The toggle only matters once there's a location to show; stored
      // either way so flipping it back on later doesn't need re-entering.
      visibleOnMap,
    })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
