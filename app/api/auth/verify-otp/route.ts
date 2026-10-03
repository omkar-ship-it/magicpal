import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { otpCodes, users } from "@/lib/db/schema";
import { verifyOtpCode } from "@/lib/otp";
import { createSession, setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Accounts aren't available right now." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!email || !code) return NextResponse.json({ error: "Enter the code." }, { status: 400 });

  // Every outstanding code is checked, not just the newest — asking twice
  // because the first email is slow shouldn't make the first code (which
  // still arrives) come back "wrong". Capped at five so a flood of requests
  // can't turn one sign-in into unbounded scrypt work.
  const outstanding = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(5);

  const match = outstanding.find((row) => verifyOtpCode(code, row.codeHash));
  if (!match) {
    return NextResponse.json({ error: "That code isn't right. Check the latest email." }, { status: 401 });
  }
  if (match.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "That code has expired — send yourself a new one." }, { status: 401 });
  }

  // Signing in retires every other code outstanding for this address, so an
  // older email sitting in an inbox can't be replayed later.
  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.email, email), isNull(otpCodes.consumedAt)));

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    [user] = await db.insert(users).values({ email }).returning();
  }

  await setSessionCookie(await createSession(user.id));
  return NextResponse.json({ ok: true, email: user.email, onboarded: Boolean(user.name) });
}
