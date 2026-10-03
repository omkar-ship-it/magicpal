import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Salted scrypt. A code is only ever compared, never stored or logged in
 * the clear — the hash is useless to anyone who only has database access,
 * which is exactly the threat this is defending against.
 */
export function hashPasscode(code: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(code, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasscode(code: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(code, salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
