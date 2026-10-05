"use client";

export type Section = "network" | "chats" | "events" | "institutions" | "companies";

export const SECTIONS: Array<{ id: Section; label: string; emoji: string }> = [
  { id: "network", label: "Network", emoji: "🌐" },
  { id: "chats", label: "Chats", emoji: "💬" },
  { id: "events", label: "Events", emoji: "📅" },
  { id: "institutions", label: "Institutions", emoji: "🏛" },
  { id: "companies", label: "Companies", emoji: "🏢" },
];

/**
 * The only chrome on the map by default: one icon. Clicking it opens five
 * blocks; clicking a block opens that section. Everything else — filters,
 * lists, feeds, chats — lives inside a section and is summoned rather than
 * parked on screen.
 */
export default function DockBar({
  open,
  active,
  unread,
  query,
  results,
  onOpenChange,
  onSelect,
  onQueryChange,
  onPickResult,
}: {
  open: boolean;
  active: Section | null;
  /** Shown as a dot on Chats. */
  unread: number;
  query: string;
  results: Array<{ label: string; lat: number; lng: number }>;
  onOpenChange: (v: boolean) => void;
  onSelect: (s: Section) => void;
  onQueryChange: (q: string) => void;
  onPickResult: (r: { label: string; lat: number; lng: number }) => void;
}) {
  if (!open) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[1350] flex justify-center px-3">
        <button
          onClick={() => onOpenChange(true)}
          className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full text-[22px] text-white transition-transform hover:scale-105"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))", boxShadow: "var(--shadow-lift)" }}
          title="Open MagicPal"
          aria-label="Open"
        >
          ✦
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[1350] flex flex-col items-center gap-2 px-3">
      {results.length > 0 && (
        <div className="pointer-events-auto card w-full max-w-[460px] overflow-hidden p-1">
          {results.map((r) => (
            <button
              key={`${r.lat},${r.lng}`}
              onClick={() => onPickResult(r)}
              className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-[var(--sunk)]"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <div
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-3xl border border-[var(--line)] p-1.5"
        style={{ background: "color-mix(in srgb, var(--card) 94%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="relative flex-none">
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
            className="w-[170px] rounded-2xl border-none bg-[var(--sunk)] py-2.5 pl-8 pr-3 text-[12.5px] text-[var(--ink)] outline-none"
            placeholder="Search a place…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        <span className="mx-0.5 h-8 w-px flex-none" style={{ background: "var(--line)" }} />

        {SECTIONS.map((s) => {
          const on = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="relative flex w-[76px] flex-none flex-col items-center gap-0.5 rounded-2xl py-1.5 transition-colors"
              style={on ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))" } : undefined}
              title={s.label}
            >
              <span className="text-[17px] leading-none">{s.emoji}</span>
              <span className="text-[11px] font-semibold" style={{ color: on ? "var(--brand)" : "var(--ink-soft)" }}>
                {s.label}
              </span>
              {s.id === "chats" && unread > 0 && (
                <span
                  className="absolute right-3 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ background: "var(--brand)" }}
                >
                  {unread}
                </span>
              )}
            </button>
          );
        })}

        <span className="mx-0.5 h-8 w-px flex-none" style={{ background: "var(--line)" }} />

        <button onClick={() => onOpenChange(false)} className="win-btn flex-none" title="Collapse">
          ▾
        </button>
      </div>
    </div>
  );
}
