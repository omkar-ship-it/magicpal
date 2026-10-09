"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ROLE_GROUPS, cityById, timeOfferFor, type CircleEvent, type CircleMember } from "@/lib/circleData";
import { mentorTier } from "@/lib/circleData";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import { IconCalendar, IconCheck, IconChevronDown, IconSearch, IconX } from "./Icons";

export type Facets = {
  role: string;
  city: string | null;
  helpWith: string | null;
  verifiedOnly: boolean;
  mentorsOnly: boolean;
  bookableOnly: boolean;
};

export const NO_FACETS: Facets = { role: "all", city: null, helpWith: null, verifiedOnly: false, mentorsOnly: false, bookableOnly: false };

export function activeFacetCount(f: Facets): number {
  return (
    (f.role !== "all" ? 1 : 0) +
    (f.city ? 1 : 0) +
    (f.helpWith ? 1 : 0) +
    (f.verifiedOnly ? 1 : 0) +
    (f.mentorsOnly ? 1 : 0) +
    (f.bookableOnly ? 1 : 0)
  );
}

/**
 * The one text test, used by the result list and by the map.
 *
 * They were separate for a while and drifted: the dropdown searched what
 * people can help with and the map didn't, so typing "fundraising" showed
 * ten results above a map that had emptied itself. Two different answers to
 * "who is in this network" on one screen is the fastest way to make a map
 * untrustworthy.
 */
export function matchesQuery(m: CircleMember, q: string): boolean {
  if (!q) return true;
  return `${m.name} ${m.headline} ${m.company} ${cityById(m.cityId)?.name ?? ""} ${m.helpWith.join(" ")}`.toLowerCase().includes(q);
}

export function matchesFacets(m: CircleMember, f: Facets): boolean {
  if (f.role !== "all" && !(ROLE_GROUPS.find((r) => r.id === f.role) ?? ROLE_GROUPS[0]).match(m)) return false;
  if (f.city && m.cityId !== f.city) return false;
  if (f.helpWith && !m.helpWith.includes(f.helpWith)) return false;
  if (f.verifiedOnly && !m.verified) return false;
  if (f.mentorsOnly && m.mentoredCount === 0) return false;
  if (f.bookableOnly && !timeOfferFor(m)) return false;
  return true;
}

/**
 * One search field, and filters that aren't there until you want them.
 *
 * The brief was to stop laying the controls out. A faceted sidebar in a
 * product whose whole surface is a map spends permanent screen on something
 * most people never touch — so this is a pill until tapped, a field once it
 * is, and a filter sheet only if you ask for one. The one thing that stays
 * visible is the count of active filters, because a filter you've forgotten
 * about is worse than no filter at all.
 *
 * Whatever is narrowed here narrows the map too. Two different answers to
 * "who is in this network" on the same screen is the fastest way to make a
 * map untrustworthy.
 */
export default function SearchBar({
  people,
  events,
  facets,
  query,
  cities,
  topics,
  showMentorFilters,
  onQuery,
  onFacets,
  onOpenMember,
  onOpenEvent,
}: {
  people: CircleMember[];
  events: CircleEvent[];
  facets: Facets;
  query: string;
  cities: Array<{ id: string; name: string; count: number }>;
  topics: string[];
  /** Mentor and verification facets only make sense in an alumni network. */
  showMentorFilters: boolean;
  onQuery: (q: string) => void;
  onFacets: (f: Facets) => void;
  onOpenMember: (id: string) => void;
  onOpenEvent: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const count = activeFacetCount(facets);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!q) return { people: [] as CircleMember[], events: [] as CircleEvent[] };
    return {
      people: people.filter((m) => matchesQuery(m, q)).slice(0, 8),
      events: events.filter((e) => `${e.name} ${e.venue ?? ""}`.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [q, people, events]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-[var(--line)] px-2.5 py-2"
        style={{ background: "color-mix(in srgb, var(--card) 95%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow)" }}
        title="Search and filter (⌘K)"
        aria-label="Search and filter"
      >
        <IconSearch size={15} className="text-[var(--ink-soft)]" />
        {count > 0 && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "var(--brand)" }}>
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="pointer-events-auto w-[min(440px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[var(--line)]"
      style={{ background: "color-mix(in srgb, var(--card) 97%, transparent)", backdropFilter: "blur(14px)", boxShadow: "var(--shadow-lift)" }}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <IconSearch size={15} className="flex-none text-[var(--ink-soft)]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Name, role, company, city, a topic…"
          className="min-w-0 flex-1 border-none bg-transparent py-1.5 text-[13px] outline-none"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="tap flex flex-none items-center gap-1 rounded-xl px-2 py-1 text-[11.5px] font-semibold"
          style={count > 0 || showFilters ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" } : { color: "var(--ink-soft)" }}
          aria-expanded={showFilters}
        >
          Filters{count > 0 ? ` ${count}` : ""}
          <IconChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : undefined }} />
        </button>
        <button
          onClick={() => {
            onQuery("");
            setOpen(false);
            setShowFilters(false);
          }}
          className="win-btn flex-none"
          aria-label="Close search"
        >
          <IconX size={14} />
        </button>
      </div>

      {/* Active filters stay visible even with the sheet shut, so nothing is
          silently narrowing the map behind your back. */}
      {count > 0 && !showFilters && (
        <div className="flex flex-wrap gap-1 px-2.5 pb-2">
          {facets.role !== "all" && <Chip label={ROLE_GROUPS.find((r) => r.id === facets.role)?.label ?? ""} onClear={() => onFacets({ ...facets, role: "all" })} />}
          {facets.city && <Chip label={cityById(facets.city)?.name ?? ""} onClear={() => onFacets({ ...facets, city: null })} />}
          {facets.helpWith && <Chip label={facets.helpWith} onClear={() => onFacets({ ...facets, helpWith: null })} />}
          {facets.verifiedOnly && <Chip label="Verified" onClear={() => onFacets({ ...facets, verifiedOnly: false })} />}
          {facets.mentorsOnly && <Chip label="Mentors" onClear={() => onFacets({ ...facets, mentorsOnly: false })} />}
          {facets.bookableOnly && <Chip label="Open to book" onClear={() => onFacets({ ...facets, bookableOnly: false })} />}
          <button onClick={() => onFacets(NO_FACETS)} className="px-1.5 text-[11px] font-semibold" style={{ color: "var(--ink-soft)" }}>
            Clear all
          </button>
        </div>
      )}

      {showFilters && (
        <div className="max-h-[46vh] overflow-y-auto border-t border-[var(--line)] px-2.5 py-2">
          <Group label="What they do">
            <div className="flex flex-wrap gap-1">
              {ROLE_GROUPS.map((r) => (
                <Pick key={r.id} label={r.label} on={facets.role === r.id} onClick={() => onFacets({ ...facets, role: r.id })} />
              ))}
            </div>
          </Group>

          <Group label="Where">
            <div className="flex flex-wrap gap-1">
              <Pick label="Anywhere" on={facets.city === null} onClick={() => onFacets({ ...facets, city: null })} />
              {cities.slice(0, 10).map((c) => (
                <Pick key={c.id} label={`${c.name} ${c.count}`} on={facets.city === c.id} onClick={() => onFacets({ ...facets, city: c.id })} />
              ))}
            </div>
          </Group>

          <Group label="Can help with">
            <div className="flex flex-wrap gap-1">
              <Pick label="Anything" on={facets.helpWith === null} onClick={() => onFacets({ ...facets, helpWith: null })} />
              {topics.slice(0, 12).map((t) => (
                <Pick key={t} label={t} on={facets.helpWith === t} onClick={() => onFacets({ ...facets, helpWith: t })} />
              ))}
            </div>
          </Group>

          <Group label="Only show">
            <div className="flex flex-wrap gap-1">
              {showMentorFilters && (
                <>
                  <Pick label="Verified alumni" on={facets.verifiedOnly} onClick={() => onFacets({ ...facets, verifiedOnly: !facets.verifiedOnly })} />
                  <Pick label="Mentors" on={facets.mentorsOnly} onClick={() => onFacets({ ...facets, mentorsOnly: !facets.mentorsOnly })} />
                </>
              )}
              <Pick label="Open to book" on={facets.bookableOnly} onClick={() => onFacets({ ...facets, bookableOnly: !facets.bookableOnly })} />
            </div>
          </Group>

          <button onClick={() => onFacets(NO_FACETS)} className="btn btn-ghost btn-sm mb-1 mt-1 w-full">
            Clear all filters
          </button>
        </div>
      )}

      {q.length > 0 && !showFilters && (
        <div className="max-h-[46vh] overflow-y-auto border-t border-[var(--line)] p-1">
          {hits.people.length === 0 && hits.events.length === 0 && (
            <p className="px-2.5 py-4 text-[12.5px] text-[var(--ink-soft)]">Nothing matches that.</p>
          )}
          {hits.people.map((m) => {
            const tier = mentorTier(m.mentoredCount);
            return (
              <button
                key={m.id}
                onClick={() => {
                  onOpenMember(m.id);
                  setOpen(false);
                }}
                className="tap flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-[var(--sunk)]"
              >
                <Avatar name={m.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[12.5px] font-semibold leading-tight">
                    <span className="min-w-0 truncate">{m.name}</span>
                    {m.verified && <VerifiedBadge size={11} />}
                  </span>
                  <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                    {m.headline} · {cityById(m.cityId)?.name}
                  </span>
                </span>
                {tier && <IconCheck size={13} className="flex-none" style={{ color: "var(--brand)" }} />}
              </button>
            );
          })}
          {hits.events.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                onOpenEvent(e.id);
                setOpen(false);
              }}
              className="tap flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-[var(--sunk)]"
            >
              <span className="grid h-8 w-8 flex-none place-items-center rounded-lg" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                <IconCalendar size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold leading-tight">{e.name}</span>
                <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">{e.dateLabel}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
      {children}
    </div>
  );
}

function Pick({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tap rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
      style={on ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" } : { background: "var(--sunk)", color: "var(--ink-soft)" }}
      aria-pressed={on}
    >
      {label}
    </button>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }}
    >
      {label}
      <button onClick={onClear} aria-label={`Remove ${label}`}>
        <IconX size={11} />
      </button>
    </span>
  );
}
