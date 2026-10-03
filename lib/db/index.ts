import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * POSTGRES_URL wins over DATABASE_URL when both exist — `vercel env pull`
 * writes POSTGRES_URL for the managed Neon integration, and a stray
 * DATABASE_URL left over from local dev should never silently out-prioritise
 * the one Vercel actually wired up.
 */
const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

export const hasDb = Boolean(url);

/**
 * Neon's serverless HTTP driver in production (no long-lived TCP connection
 * to manage across serverless invocations), node-postgres locally (a plain
 * TCP connection to a local Postgres is simpler and doesn't need Neon's
 * driver at all). Switched on the host rather than an explicit flag, so
 * pulling production env vars into a local shell by mistake doesn't
 * accidentally start talking to prod with the wrong driver.
 */
export const db = !url
  ? null
  : url.includes("neon.tech")
    ? drizzleNeon(neon(url), { schema })
    : drizzleNode(new Pool({ connectionString: url }), { schema });
