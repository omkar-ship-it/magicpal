import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  requestConnection,
  getConnectionBetween,
  listIncomingRequests,
  listOutgoingRequests,
  listAcceptedConnections,
} from "@/lib/connections";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const toUserId = typeof body?.toUserId === "string" ? body.toUserId : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : undefined;
  if (!/^[0-9a-f-]{36}$/i.test(toUserId)) {
    return NextResponse.json({ error: "Unknown person." }, { status: 400 });
  }
  if (toUserId === user.id) {
    return NextResponse.json({ error: "You can't connect with yourself." }, { status: 400 });
  }

  const row = await requestConnection(user.id, toUserId, note);
  if (!row) return NextResponse.json({ error: "Couldn't send that request." }, { status: 500 });
  return NextResponse.json({ ok: true, status: row.status, mine: row.requesterId === user.id });
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const params = new URL(req.url).searchParams;

  // ?pending=1 — the inbox. Lets the map surface "someone wants to meet you"
  // without sending people to a separate page for it.
  if (params.get("pending")) {
    const [incoming, outgoing] = await Promise.all([listIncomingRequests(user.id), listOutgoingRequests(user.id)]);
    return NextResponse.json({ incoming, outgoing });
  }

  // ?accepted=1 — your real threads, so the map's Chats section is the only
  // place messages live and there's no separate /connections page.
  if (params.get("accepted")) {
    return NextResponse.json({ connections: await listAcceptedConnections(user.id) });
  }

  const otherId = params.get("with");
  if (!otherId) return NextResponse.json({ error: "Missing ?with=" }, { status: 400 });

  const row = await getConnectionBetween(user.id, otherId);
  return NextResponse.json({
    status: row?.status ?? null,
    connectionId: row?.id ?? null,
    mine: row ? row.requesterId === user.id : null,
  });
}
