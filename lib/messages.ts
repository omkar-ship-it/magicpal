import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { db, hasDb } from "./db";
import { connections, messages } from "./db/schema";

/**
 * Every message route goes through this first: is the asker actually one of
 * the two people in this connection, and is it accepted? Sending into a
 * pending or declined connection is refused here, not just hidden in the
 * UI — a connection id is guessable (or just visible in a network tab), and
 * the uuid alone must never be enough to read or post into someone else's
 * thread.
 */
export async function assertParticipant(connectionId: string, userId: string) {
  if (!hasDb || !db) return null;
  const [row] = await db.select().from(connections).where(eq(connections.id, connectionId)).limit(1);
  if (!row) return null;
  if (row.userAId !== userId && row.userBId !== userId) return null;
  if (row.status !== "accepted") return null;
  return row;
}

export async function listMessages(connectionId: string) {
  if (!hasDb || !db) return [];
  return db
    .select()
    .from(messages)
    .where(eq(messages.connectionId, connectionId))
    .orderBy(asc(messages.createdAt));
}

export async function sendMessage(connectionId: string, senderId: string, body: string) {
  if (!hasDb || !db) return null;
  const [row] = await db.insert(messages).values({ connectionId, senderId, body }).returning();
  return row;
}

/** Marks the other person's messages as read once this person has opened the thread. */
export async function markRead(connectionId: string, readerId: string) {
  if (!hasDb || !db) return;
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.connectionId, connectionId), ne(messages.senderId, readerId), isNull(messages.readAt)));
}
