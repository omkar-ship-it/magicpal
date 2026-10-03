import { and, eq, gt } from "drizzle-orm";
import { db, hasDb } from "./db";
import { drops, users } from "./db/schema";
import { DROP_DURATION_OPTIONS_MIN, MAX_DROP_LABEL } from "./rules";

export async function getActiveDrop(userId: string) {
  if (!hasDb || !db) return null;
  const [row] = await db
    .select()
    .from(drops)
    .where(and(eq(drops.userId, userId), gt(drops.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

/**
 * Only one live drop per person — creating a new one clears any existing
 * one first rather than erroring, the same "asking again just confirms"
 * idempotency used for connection requests. Requires a location and map
 * visibility already set: a drop is a louder, temporary version of "come
 * find me," so it doesn't make sense for someone who's opted out of being
 * found at all.
 */
export async function createDrop(userId: string, opts: { label: string; durationMinutes: number }) {
  if (!hasDb || !db) return null;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.lat == null || user.lng == null) return { error: "Set your location in your profile first." as const };
  if (!user.visibleOnMap) return { error: "Turn on map visibility before dropping a pin." as const };

  const label = opts.label.trim().slice(0, MAX_DROP_LABEL);
  if (!label) return { error: "Say what you're up to." as const };

  const duration = (DROP_DURATION_OPTIONS_MIN as readonly number[]).includes(opts.durationMinutes)
    ? opts.durationMinutes
    : DROP_DURATION_OPTIONS_MIN[0];

  await db.delete(drops).where(eq(drops.userId, userId));
  const [row] = await db
    .insert(drops)
    .values({
      userId,
      lat: user.lat,
      lng: user.lng,
      label,
      expiresAt: new Date(Date.now() + duration * 60_000),
    })
    .returning();
  return { row };
}

export async function cancelDrop(userId: string) {
  if (!hasDb || !db) return;
  await db.delete(drops).where(eq(drops.userId, userId));
}
