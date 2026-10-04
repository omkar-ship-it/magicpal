import { and, desc, eq, or } from "drizzle-orm";
import { db, hasDb } from "./db";
import { connections, users } from "./db/schema";
import { jitterLocation } from "./geo";
import { orderedPair } from "./rules";

export type ConnectionWithStatus = {
  id: string;
  status: string;
  requesterId: string;
  otherUserId: string;
  otherName: string | null;
  otherHeadline: string | null;
  otherPhotoUrl: string | null;
  createdAt: Date;
};

/** The single row describing the relationship between two people, if any. */
export async function getConnectionBetween(userId: string, otherId: string) {
  if (!hasDb || !db) return null;
  const [a, b] = orderedPair(userId, otherId);
  const [row] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.userAId, a), eq(connections.userBId, b)))
    .limit(1);
  return row ?? null;
}

/**
 * Open a request. The unique index on the ordered pair is what actually
 * stops a duplicate — `onConflictDoNothing` just turns that into a quiet
 * no-op instead of a thrown constraint error, so "I already asked" and "I'm
 * asking for the first time" both come back looking like success.
 */
export async function requestConnection(fromId: string, toId: string) {
  if (!hasDb || !db) return null;
  const [a, b] = orderedPair(fromId, toId);
  const [row] = await db
    .insert(connections)
    .values({ userAId: a, userBId: b, requesterId: fromId, status: "pending" })
    .onConflictDoNothing()
    .returning();
  return row ?? (await getConnectionBetween(fromId, toId));
}

export async function respondToConnection(connectionId: string, userId: string, accept: boolean) {
  if (!hasDb || !db) return null;
  const [row] = await db
    .select()
    .from(connections)
    .where(eq(connections.id, connectionId))
    .limit(1);
  if (!row) return null;
  // Only the person who DIDN'T send it can respond to it.
  if (row.requesterId === userId) return null;
  if (row.userAId !== userId && row.userBId !== userId) return null;
  if (row.status !== "pending") return row;

  const [updated] = await db
    .update(connections)
    .set({ status: accept ? "accepted" : "declined", respondedAt: new Date() })
    .where(eq(connections.id, connectionId))
    .returning();
  return updated;
}

/** Incoming requests waiting on this person's answer. */
export async function listIncomingRequests(userId: string): Promise<ConnectionWithStatus[]> {
  if (!hasDb || !db) return [];
  const rows = await db
    .select({
      id: connections.id,
      status: connections.status,
      requesterId: connections.requesterId,
      userAId: connections.userAId,
      userBId: connections.userBId,
      createdAt: connections.createdAt,
      otherName: users.name,
      otherHeadline: users.headline,
      otherPhotoUrl: users.photoUrl,
    })
    .from(connections)
    .innerJoin(users, eq(users.id, connections.requesterId))
    .where(
      and(
        eq(connections.status, "pending"),
        or(eq(connections.userAId, userId), eq(connections.userBId, userId))
      )
    )
    .orderBy(desc(connections.createdAt));

  return rows
    .filter((r) => r.requesterId !== userId) // incoming only, not what I sent
    .map((r) => ({
      id: r.id,
      status: r.status,
      requesterId: r.requesterId,
      otherUserId: r.requesterId,
      otherName: r.otherName,
      otherHeadline: r.otherHeadline,
      otherPhotoUrl: r.otherPhotoUrl,
      createdAt: r.createdAt,
    }));
}

/** Requests I sent that are still waiting on an answer. */
export async function listOutgoingRequests(userId: string): Promise<ConnectionWithStatus[]> {
  if (!hasDb || !db) return [];
  const rows = await db
    .select({
      id: connections.id,
      status: connections.status,
      requesterId: connections.requesterId,
      userAId: connections.userAId,
      userBId: connections.userBId,
      createdAt: connections.createdAt,
    })
    .from(connections)
    .where(and(eq(connections.status, "pending"), eq(connections.requesterId, userId)))
    .orderBy(desc(connections.createdAt));

  const otherIds = rows.map((r) => (r.userAId === userId ? r.userBId : r.userAId));
  if (otherIds.length === 0) return [];
  const others = await db.select().from(users).where(or(...otherIds.map((id) => eq(users.id, id))));
  const byId = new Map(others.map((o) => [o.id, o]));

  return rows.map((r) => {
    const otherId = r.userAId === userId ? r.userBId : r.userAId;
    const other = byId.get(otherId);
    return {
      id: r.id,
      status: r.status,
      requesterId: r.requesterId,
      otherUserId: otherId,
      otherName: other?.name ?? null,
      otherHeadline: other?.headline ?? null,
      otherPhotoUrl: other?.photoUrl ?? null,
      createdAt: r.createdAt,
    };
  });
}

/** People I'm actually connected to. */
export async function listAcceptedConnections(userId: string): Promise<ConnectionWithStatus[]> {
  if (!hasDb || !db) return [];
  const rows = await db
    .select({
      id: connections.id,
      status: connections.status,
      requesterId: connections.requesterId,
      userAId: connections.userAId,
      userBId: connections.userBId,
      createdAt: connections.createdAt,
    })
    .from(connections)
    .where(and(eq(connections.status, "accepted"), or(eq(connections.userAId, userId), eq(connections.userBId, userId))))
    .orderBy(desc(connections.createdAt));

  const otherIds = rows.map((r) => (r.userAId === userId ? r.userBId : r.userAId));
  if (otherIds.length === 0) return [];
  const others = await db.select().from(users).where(or(...otherIds.map((id) => eq(users.id, id))));
  const byId = new Map(others.map((o) => [o.id, o]));

  return rows.map((r) => {
    const otherId = r.userAId === userId ? r.userBId : r.userAId;
    const other = byId.get(otherId);
    return {
      id: r.id,
      status: r.status,
      requesterId: r.requesterId,
      otherUserId: otherId,
      otherName: other?.name ?? null,
      otherHeadline: other?.headline ?? null,
      otherPhotoUrl: other?.photoUrl ?? null,
      createdAt: r.createdAt,
    };
  });
}

export type NetworkPoint = {
  connectionId: string;
  userId: string;
  name: string;
  headline: string | null;
  company: string | null;
  photoUrl: string | null;
  locationLabel: string | null;
  lat: number;
  lng: number;
};

/**
 * Every accepted connection with a placeable point on the world map — same
 * `visibleOnMap` + "has a location" rule as the nearby map, so a connection
 * who's turned visibility off disappears from here too rather than this
 * view quietly becoming a second, looser privacy model.
 */
export async function listNetworkMapPoints(userId: string): Promise<NetworkPoint[]> {
  if (!hasDb || !db) return [];
  const rows = await db
    .select({ id: connections.id, userAId: connections.userAId, userBId: connections.userBId })
    .from(connections)
    .where(and(eq(connections.status, "accepted"), or(eq(connections.userAId, userId), eq(connections.userBId, userId))));

  const otherIds = rows.map((r) => (r.userAId === userId ? r.userBId : r.userAId));
  if (otherIds.length === 0) return [];

  const others = await db.select().from(users).where(or(...otherIds.map((id) => eq(users.id, id))));
  const connectionIdByOtherId = new Map(rows.map((r) => [r.userAId === userId ? r.userBId : r.userAId, r.id]));

  return others
    .filter((o) => o.visibleOnMap && o.lat != null && o.lng != null && o.name)
    .map((o) => {
      const jittered = jitterLocation(o.id, o.lat!, o.lng!);
      return {
        connectionId: connectionIdByOtherId.get(o.id)!,
        userId: o.id,
        name: o.name!,
        headline: o.headline,
        company: o.company,
        photoUrl: o.photoUrl,
        locationLabel: o.locationLabel,
        lat: jittered.lat,
        lng: jittered.lng,
      };
    });
}
