import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { assertParticipant, listMessages, markRead, sendMessage } from "@/lib/messages";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const connectionId = new URL(req.url).searchParams.get("connectionId") ?? "";
  const connection = await assertParticipant(connectionId, user.id);
  if (!connection) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await markRead(connectionId, user.id);
  const rows = await listMessages(connectionId);
  return NextResponse.json({ messages: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const connectionId = typeof body?.connectionId === "string" ? body.connectionId : "";
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 2000) : "";
  if (!text) return NextResponse.json({ error: "Say something first." }, { status: 400 });

  const connection = await assertParticipant(connectionId, user.id);
  if (!connection) return NextResponse.json({ error: "You can only message a connection you've accepted." }, { status: 403 });

  const row = await sendMessage(connectionId, user.id, text);
  return NextResponse.json({ ok: true, message: row });
}
