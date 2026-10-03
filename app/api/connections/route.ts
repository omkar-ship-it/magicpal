import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { requestConnection, getConnectionBetween } from "@/lib/connections";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const toUserId = typeof body?.toUserId === "string" ? body.toUserId : "";
  if (!/^[0-9a-f-]{36}$/i.test(toUserId)) {
    return NextResponse.json({ error: "Unknown person." }, { status: 400 });
  }
  if (toUserId === user.id) {
    return NextResponse.json({ error: "You can't connect with yourself." }, { status: 400 });
  }

  const row = await requestConnection(user.id, toUserId);
  if (!row) return NextResponse.json({ error: "Couldn't send that request." }, { status: 500 });
  return NextResponse.json({ ok: true, status: row.status, mine: row.requesterId === user.id });
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const otherId = new URL(req.url).searchParams.get("with");
  if (!otherId) return NextResponse.json({ error: "Missing ?with=" }, { status: 400 });

  const row = await getConnectionBetween(user.id, otherId);
  return NextResponse.json({
    status: row?.status ?? null,
    connectionId: row?.id ?? null,
    mine: row ? row.requesterId === user.id : null,
  });
}
