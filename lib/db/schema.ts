import { pgTable, text, timestamp, uuid, uniqueIndex, boolean, doublePrecision, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------- auth
// Hand-rolled email OTP: a user row appears on first successful verify,
// codes are hashed at rest, and the session id is itself the opaque bearer
// token stored in an httpOnly cookie. No password anywhere.

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),

  // ------------------------------------------------------------ profile
  // Null until onboarding completes. A user can exist (has signed in) with
  // no profile yet — that's the state right after their first OTP verify.
  name: text("name"),
  headline: text("headline"), // "Product Manager at Acme"
  company: text("company"),
  bio: text("bio"),
  skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
  photoUrl: text("photo_url"),

  // Optional — shown as icon links on the profile card when set.
  linkedinUrl: text("linkedin_url"),
  instagramUrl: text("instagram_url"),
  websiteUrl: text("website_url"),

  // -------------------------------------------------------- location
  // Exact coordinates, never sent to the client as-is for anyone but the
  // profile's own owner — see lib/geo.ts:jitter for what other people see.
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  // The human-readable place name from geocoding ("Koramangala, Bengaluru"),
  // shown instead of coordinates everywhere in the UI.
  locationLabel: text("location_label"),
  /**
   * On by default once a location is set — a networking map where everyone
   * starts invisible has nothing on it, and the entire pitch is "be found".
   * Setting a location is the opt-in; this is the opt-out on top of it.
   * Enforced at every query that powers the map, not just hidden in the UI.
   */
  visibleOnMap: boolean("visible_on_map").notNull().default(true),

  /**
   * Touched by a heartbeat ping while any authenticated page is open —
   * powers the "N people active nearby right now" pulse. Deliberately
   * bucketed to a wide window at read time (see ACTIVE_WINDOW_MINUTES in
   * rules.ts) rather than shown as an exact last-seen time: a precise
   * "active 2 min ago" reads as surveillance the way Facebook's old green
   * dot did, "active recently" reads as ambient energy.
   */
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------------------------------------- connections

/**
 * One row per relationship between two people, however it started.
 *
 * `userAId`/`userBId` are the two participants in a fixed canonical order
 * (A is always the lexicographically smaller id) — that's what lets a
 * single unique index stop a duplicate request in *either* direction: A
 * requesting B and B requesting A are the same pair, and the database
 * should refuse the second one, not just the application layer. Which of
 * the two actually sent the request is `requesterId`, kept separately so
 * "Jane wants to connect" can still be displayed correctly.
 */
export const connections = pgTable(
  "connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending | accepted | declined
    /**
     * An optional note attached when the request was sent — the one way to
     * say something to someone before you're connected. Delivered as the
     * first message the moment the request is accepted (see
     * lib/connections.ts:respondToConnection); never shown or sendable
     * after that point, so this column doesn't need its own read/reply UI.
     */
    requestNote: text("request_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("connections_pair_idx").on(t.userAId, t.userBId),
    check("connections_pair_order", sql`${t.userAId} < ${t.userBId}`),
  ]
);

/**
 * Only ever sent inside an accepted connection — enforced in the API route,
 * not here, since "is this connection accepted" is a runtime check against
 * another table, not something a column constraint can express.
 */
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

// ----------------------------------------------------------------- drops

/**
 * A time-boxed "I'm here, come say hi" signal — separate from a person's
 * permanent home pin. One row per drop; expiry is just `expiresAt` checked
 * at query time (`expiresAt > now()`), the same "good enough, no cron"
 * choice made everywhere else in this schema. A person has at most one live
 * drop at a time — enforced in lib/drops.ts by clearing any existing drop
 * before inserting a new one, rather than as a DB constraint, since "at most
 * one *unexpired* row" isn't something a plain unique index can express.
 */
export const drops = pgTable("drops", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  label: text("label").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
