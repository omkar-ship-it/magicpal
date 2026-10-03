import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { cancelDrop, createDrop, getActiveDrop } from "@/lib/drops";
import { DEFAULT_DROP_DURATION_MIN } from "@/lib/rules";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const drop = await getActiveDrop(user.id);
  return NextResponse.json({ drop: drop ? { label: drop.label, expiresAt: drop.expiresAt } : null });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label : "";
  const durationMinutes = Number(body?.durationMinutes) || DEFAULT_DROP_DURATION_MIN;

  const result = await createDrop(user.id, { label, durationMinutes });
  if (!result || "error" in result) {
    return NextResponse.json({ error: result?.error ?? "Couldn't drop a pin." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, drop: { label: result.row!.label, expiresAt: result.row!.expiresAt } });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  await cancelDrop(user.id);
  return NextResponse.json({ ok: true });
}
