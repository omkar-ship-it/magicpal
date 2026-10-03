import { NextResponse } from "next/server";
import { db, hasDb } from "@/lib/db";
import { otpCodes } from "@/lib/db/schema";
import { generateOtpCode, hashOtpCode, OTP_EXPIRY_MINUTES } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!hasDb || !db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a real email address." }, { status: 400 });
  }

  const code = generateOtpCode();
  await db.insert(otpCodes).values({
    email,
    codeHash: hashOtpCode(code),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000),
  });

  const sent = await sendOtpEmail(email, code);
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}
