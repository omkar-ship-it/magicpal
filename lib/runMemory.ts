"use client";

import { EMPTY_MEMORY, type Memory } from "./forYouRun";

/**
 * What a run remembers, so the second pull isn't the first pull again.
 *
 * This is the substrate the whole loop rests on. Without it "refresh"
 * returns the same faces, the deck can't refill as you act, and there is no
 * such thing as "who did I miss" — which is where most of an event's value
 * currently evaporates.
 *
 * Kept per scope: people you dismissed inside one community have nothing to
 * do with a different one. Browser storage only, because this is a
 * prototype with no accounts behind it — in production these are rows.
 */

const KEY = "magicpal.run.memory.v1";

type Store = Record<string, Memory>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function write(s: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // A full or blocked store loses the memory, not the app.
  }
}

export function loadMemory(scopeKey: string): Memory {
  return read()[scopeKey] ?? EMPTY_MEMORY;
}

export function remember(scopeKey: string, patch: Partial<Memory>): Memory {
  const store = read();
  const cur = store[scopeKey] ?? EMPTY_MEMORY;
  const next: Memory = {
    shown: dedupe([...cur.shown, ...(patch.shown ?? [])]),
    connected: dedupe([...cur.connected, ...(patch.connected ?? [])]),
    dismissed: dedupe([...cur.dismissed, ...(patch.dismissed ?? [])]),
  };
  store[scopeKey] = next;
  write(store);
  return next;
}

/** Start the board over — the only way back to people you dismissed. */
export function forgetScope(scopeKey: string): Memory {
  const store = read();
  delete store[scopeKey];
  write(store);
  return EMPTY_MEMORY;
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}
