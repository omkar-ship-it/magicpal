import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { touchActive } from "@/lib/presence";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  await touchActive(user.id);
  return NextResponse.json({ ok: true });
}
