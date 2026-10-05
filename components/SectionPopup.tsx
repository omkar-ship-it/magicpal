"use client";

import { SECTIONS, type Section } from "./DockBar";

export type PopupItem = {
  id: string;
  /** Rows are rendered under their group's heading, in the order given. */
  group?: string;
  emoji?: string;
  photo?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  /** Marks the currently selected network, so the map and the list agree visibly. */
  active?: boolean;
};

export type Chip = { id: string; label: string };

/**
 * The popup that rises out of a dock block: the section's own search, sort
 * and filters, then its list. Floats above the map rather than docking to an
 * edge, and whatever you filter here is what the map shows — the two are
 * driven by the same state.
 */
export default function SectionPopup({
  section,
  items,
  query,
  chips,
  activeChip,
  sorts,
  activeSort,
  count,
  onQuery,
  onChip,
  onSort,
  onPick,
  onClose,
  controls,
}: {
  section: Section;
  items: PopupItem[];
  query: string;
  chips: Chip[];
  activeChip: string;
  sorts?: Chip[];
  activeSort?: string;
  /** What this filter is doing to the map, in words. */
  count: string;
  onQuery: (q: string) => void;
  onChip: (id: string) => void;
  onSort?: (id: string) => void;
  onPick: (id: string) => void;
  onClose: () => void;
  /** Extra map controls for this section, shown under the filters. */
  controls?: React.ReactNode;
}) {
  const meta = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[104px] z-[1340] flex justify-center px-3">
      <div
        className="pointer-events-auto flex max-h-[min(58vh,540px)] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-[var(--line)]"
        style={{
          background: "color-mix(in srgb, var(--card) 94%, transparent)",
          backdropFilter: "blur(14px)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        <div className="flex flex-none items-center gap-2 px-3.5 pb-1 pt-3">
          <span className="text-[13px] font-semibold">
            {meta.emoji} {meta.label}
          </span>
          <span className="ml-auto text-[11px] text-[var(--ink-soft)]">
            {count}
          </span>
          <button onClick={onClose} className="win-btn flex-none" title="Close">
            ×
          </button>
        </div>

        <div className="flex-none px-3.5 pb-2">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              className="w-full rounded-xl border-none bg-[var(--sunk)] py-2 pl-8 pr-3 text-[12.5px] text-[var(--ink)] outline-none"
              placeholder={`Search ${meta.label.toLowerCase()}…`}
              value={query}
              onChange={(e) => onQuery(e.target.value)}
            />
          </div>

          {chips.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {chips.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onChip(c.id)}
                  className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
                  style={
                    activeChip === c.id
                      ? {
                          background:
                            "color-mix(in srgb, var(--brand) 14%, var(--card))",
                          color: "var(--brand)",
                          border: "1px solid var(--brand)",
                        }
                      : {
                          background: "var(--sunk)",
                          color: "var(--ink-soft)",
                          border: "1px solid transparent",
                        }
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {sorts && sorts.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className="text-[11px] text-[var(--ink-soft)]">Sort</span>
              {sorts.map((srt) => (
                <button
                  key={srt.id}
                  onClick={() => onSort?.(srt.id)}
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors"
                  style={
                    activeSort === srt.id
                      ? { background: "var(--sunk)", color: "var(--ink)" }
                      : { color: "var(--ink-soft)" }
                  }
                >
                  {srt.label}
                </button>
              ))}
            </div>
          )}
          {controls}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12.5px] text-[var(--ink-soft)]">
              Nothing matches that.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {items.map((it, i) => (
                <div key={it.id}>
                  {it.group && it.group !== items[i - 1]?.group && (
                    <p className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                      {it.group}
                    </p>
                  )}
                  <button
                    onClick={() => onPick(it.id)}
                    className="flex w-full items-center gap-2.5 rounded-2xl p-2 text-left transition-colors hover:bg-[var(--sunk)]"
                    style={
                      it.active
                        ? {
                            background:
                              "color-mix(in srgb, var(--brand) 10%, transparent)",
                          }
                        : undefined
                    }
                  >
                    {it.photo ? (
                      <span className="avatar h-9 w-9 flex-none text-[11px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.photo} alt="" />
                      </span>
                    ) : (
                      <span
                        className="grid h-9 w-9 flex-none place-items-center rounded-xl text-[16px]"
                        style={{ background: "var(--sunk)" }}
                      >
                        {it.emoji}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold leading-tight">
                        {it.title}
                      </span>
                      {it.subtitle && (
                        <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                          {it.subtitle}
                        </span>
                      )}
                      {it.meta && (
                        <span className="block truncate text-[11px] text-[var(--ink-soft)]">
                          {it.meta}
                        </span>
                      )}
                    </span>
                    <span className="flex-none text-[var(--ink-soft)]">›</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
