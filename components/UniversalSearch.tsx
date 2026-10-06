"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import { ALL_ENTITIES, ancestorsOf } from "@/lib/networks";
import { MOCK_COMPANIES, MOCK_EVENTS } from "@/lib/prototypeData";
import type { Profile } from "./MapPrimitives";

type Named = { id: string; title: string; subtitle: string };

export type SearchHit =
  | ({ kind: "person"; photo: string } & Named)
  | ({ kind: "entity"; emoji: string } & Named)
  | ({ kind: "event"; emoji: string } & Named)
  | ({ kind: "company"; emoji: string } & Named)
  | ({ kind: "place"; emoji: string; lat: number; lng: number } & Named);

const GROUP_LABEL: Record<SearchHit["kind"], string> = {
  person: "People",
  entity: "Networks, chapters & classes",
  event: "Events",
  company: "Companies",
  place: "Places",
};
const GROUP_ORDER: SearchHit["kind"][] = ["person", "entity", "event", "company", "place"];

/**
 * One search for everything. Previously the only field on screen was a place
 * geocoder, so a person's name returned cities and a chapter 74 levels deep
 * was reachable only by clicking through its region. Typing "Hyderabad" now
 * offers the chapter, the people there, the events there and the city
 * itself, and you pick which one you meant.
 */
export default function UniversalSearch({
  open,
  people,
  places,
  query,
  onOpenChange,
  onQueryChange,
  onPick,
}: {
  open: boolean;
  people: Profile[];
  places: Array<{ label: string; lat: number; lng: number }>;
  query: string;
  onOpenChange: (v: boolean) => void;
  onQueryChange: (q: string) => void;
  onPick: (hit: SearchHit) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // ⌘K / Ctrl-K from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const has = (...fields: Array<string | null | undefined>) => fields.some((f) => (f ?? "").toLowerCase().includes(q));

    const persons: SearchHit[] = people
      .filter((p) => has(p.name, p.headline, p.company, p.locationLabel))
      .slice(0, 5)
      .map((p) => ({
        kind: "person",
        id: p.id,
        title: p.name,
        subtitle: [p.headline, p.locationLabel].filter(Boolean).join(" · "),
        photo: p.photoUrl ?? avatarUrl(p.id),
      }));

    const entities: SearchHit[] = ALL_ENTITIES.filter((e) => has(e.name, e.place?.city))
      .slice(0, 6)
      .map((e) => {
        const trail = ancestorsOf(e.id);
        return {
          kind: "entity" as const,
          id: e.id,
          title: e.name,
          subtitle: [e.label, trail.map((a) => a.name).join(" › ")].filter(Boolean).join(" · "),
          emoji: e.emoji,
        };
      });

    const events: SearchHit[] = MOCK_EVENTS.filter((e) => has(e.name, e.city, e.venue))
      .slice(0, 4)
      .map((e) => ({ kind: "event" as const, id: e.id, title: e.name, subtitle: `${e.dateLabel} · ${e.city}`, emoji: "📅" }));

    const companies: SearchHit[] = MOCK_COMPANIES.filter((c) => has(c.name, c.industry, c.city))
      .slice(0, 4)
      .map((c) => ({ kind: "company" as const, id: c.id, title: c.name, subtitle: `${c.industry} · ${c.city}`, emoji: "🏢" }));

    // Geocoders happily return two places at the same coordinates (a
    // neighbourhood and its city), so the label has to be part of the id.
    const placeHits: SearchHit[] = places.slice(0, 3).map((r) => ({
      kind: "place" as const,
      id: `${r.label}@${r.lat},${r.lng}`,
      title: r.label,
      subtitle: "Go here on the map",
      emoji: "📍",
      lat: r.lat,
      lng: r.lng,
    }));

    return [...persons, ...entities, ...events, ...companies, ...placeHits];
  }, [query, people, places]);

  const ordered = GROUP_ORDER.flatMap((k) => hits.filter((h) => h.kind === k));

  if (!open) {
    return (
      <div className="pointer-events-none fixed left-3 top-3 z-[1200] sm:left-5 sm:top-5">
        <button
          onClick={() => onOpenChange(true)}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-2xl border border-[var(--line)] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
          style={{ background: "color-mix(in srgb, var(--card) 94%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
          title="Search people, networks, events, places (⌘K)"
          aria-label="Search"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-[1200] flex w-[min(440px,calc(100vw-24px))] flex-col gap-1.5 sm:left-5 sm:top-5">
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-[var(--line)] px-2"
        style={{ background: "color-mix(in srgb, var(--card) 95%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-none text-[var(--ink-soft)]">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-[13px] text-[var(--ink)] outline-none"
          placeholder="Search people, networks, chapters, events, places…"
          value={query}
          onChange={(e) => {
            // Reset the highlight with the keystroke, not in an effect — the
            // old top hit shouldn't stay selected under a new query.
            setCursor(0);
            onQueryChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onOpenChange(false);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, ordered.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            }
            if (e.key === "Enter" && ordered[cursor]) onPick(ordered[cursor]);
          }}
        />
        <button
          onClick={() => {
            onQueryChange("");
            onOpenChange(false);
          }}
          className="win-btn flex-none"
          title="Close"
        >
          ×
        </button>
      </div>

      {query.trim().length >= 2 && (
        <div
          className="pointer-events-auto max-h-[min(60vh,520px)] overflow-y-auto rounded-2xl border border-[var(--line)] p-1"
          style={{ background: "color-mix(in srgb, var(--card) 96%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
        >
          {ordered.length === 0 ? (
            <p className="px-3 py-4 text-[12.5px] text-[var(--ink-soft)]">Nothing matches that yet.</p>
          ) : (
            ordered.map((h, i) => (
              <div key={`${h.kind}-${h.id}`}>
                {(i === 0 || ordered[i - 1].kind !== h.kind) && (
                  <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{GROUP_LABEL[h.kind]}</p>
                )}
                <button
                  onClick={() => onPick(h)}
                  onMouseEnter={() => setCursor(i)}
                  className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left"
                  style={i === cursor ? { background: "var(--sunk)" } : undefined}
                >
                  {h.kind === "person" ? (
                    <span className="avatar h-8 w-8 flex-none text-[11px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.photo} alt="" />
                    </span>
                  ) : (
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-lg text-[15px]" style={{ background: "var(--sunk)" }}>
                      {h.emoji}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold leading-tight">{h.title}</span>
                    <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">{h.subtitle}</span>
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
