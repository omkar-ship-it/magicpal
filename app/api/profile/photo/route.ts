import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Photo uploads need blob storage configured." }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "That isn't an image." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Keep it under 2MB." }, { status: 400 });

  const blob = await put(`profile-photos/${user.id}-${Date.now()}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const [existing] = await db.select({ photoUrl: users.photoUrl }).from(users).where(eq(users.id, user.id)).limit(1);
  await db.update(users).set({ photoUrl: blob.url }).where(eq(users.id, user.id));

  if (existing?.photoUrl) {
    await del(existing.photoUrl).catch(() => {}); // old blob cleanup is best-effort
  }

  return NextResponse.json({ ok: true, photoUrl: blob.url });
}

export async function DELETE() {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const [existing] = await db.select({ photoUrl: users.photoUrl }).from(users).where(eq(users.id, user.id)).limit(1);
  await db.update(users).set({ photoUrl: null }).where(eq(users.id, user.id));
  if (existing?.photoUrl) await del(existing.photoUrl).catch(() => {});

  return NextResponse.json({ ok: true });
}
