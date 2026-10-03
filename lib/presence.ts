import { eq } from "drizzle-orm";
import { db, hasDb } from "./db";
import { users } from "./db/schema";

export async function touchActive(userId: string) {
  if (!hasDb || !db) return;
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, userId));
}
