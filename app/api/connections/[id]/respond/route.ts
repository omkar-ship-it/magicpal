import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { respondToConnection } from "@/lib/connections";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const accept = Boolean(body?.accept);

  const row = await respondToConnection(id, user.id, accept);
  if (!row) return NextResponse.json({ error: "That request doesn't exist, or isn't yours to answer." }, { status: 404 });
  return NextResponse.json({ ok: true, status: row.status });
}
