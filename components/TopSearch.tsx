"use client";

import { useEffect, useRef } from "react";

/**
 * Place search, top-left, as a single icon until you need it. Expands in
 * place rather than occupying the map while idle.
 */
export default function TopSearch({
  open,
  query,
  results,
  onOpenChange,
  onQueryChange,
  onPick,
}: {
  open: boolean;
  query: string;
  results: Array<{ label: string; lat: number; lng: number }>;
  onOpenChange: (v: boolean) => void;
  onQueryChange: (q: string) => void;
  onPick: (r: { label: string; lat: number; lng: number }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-[1200] sm:left-5 sm:top-5">
      <div className="pointer-events-auto flex flex-col gap-1.5">
        {open ? (
          <div
            className="flex items-center gap-1 rounded-2xl border border-[var(--line)] px-2"
            style={{ background: "color-mix(in srgb, var(--card) 94%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-none text-[var(--ink-soft)]">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              className="w-[220px] border-none bg-transparent py-2.5 text-[13px] text-[var(--ink)] outline-none sm:w-[280px]"
              placeholder="Search a city or neighbourhood…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onOpenChange(false);
              }}
            />
            <button
              onClick={() => {
                onQueryChange("");
                onOpenChange(false);
              }}
              className="win-btn flex-none"
              title="Close search"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenChange(true)}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--line)] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
            style={{ background: "color-mix(in srgb, var(--card) 94%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
            title="Search a place"
            aria-label="Search a place"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {open && results.length > 0 && (
          <div
            className="overflow-hidden rounded-2xl border border-[var(--line)] p-1"
            style={{ background: "color-mix(in srgb, var(--card) 96%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
          >
            {results.map((r) => (
              <button
                key={`${r.lat},${r.lng}`}
                onClick={() => onPick(r)}
                className="block w-full rounded-xl px-3 py-2 text-left text-[13px] hover:bg-[var(--sunk)]"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
