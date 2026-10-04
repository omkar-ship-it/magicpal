import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listNetworkMapPoints } from "@/lib/connections";

/** Every accepted connection, worldwide, for the globe/arc "My Network" view. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const points = await listNetworkMapPoints(user.id);
  return NextResponse.json({ points });
}
