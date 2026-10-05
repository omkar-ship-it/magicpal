"use client";

/**
 * What the map is currently showing, when a network page has been stood
 * down rather than closed. The page is out of the way but the scope is
 * still on — only that network's people are on the map — and this is where
 * you narrow them by city without leaving it.
 */
export default function ScopePill({
  emoji,
  name,
  count,
  cities,
  activeCity,
  onCity,
  onRestore,
  onClear,
}: {
  emoji: string;
  name: string;
  count: number;
  cities: Array<{ name: string; count: number }>;
  activeCity: string | null;
  onCity: (city: string | null) => void;
  onRestore: () => void;
  onClear: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[1200] flex flex-col items-center gap-1.5 px-3 sm:top-5">
      <div
        className="pointer-events-auto flex max-w-full items-center gap-1 rounded-2xl border border-[var(--line)] p-1 pl-2.5"
        style={{ background: "color-mix(in srgb, var(--card) 94%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow-lift)" }}
      >
        <button onClick={onRestore} className="flex min-w-0 items-center gap-1.5 py-1.5 pr-1 text-left" title="Open the page again">
          <span className="flex-none text-[15px]">{emoji}</span>
          <span className="truncate text-[12.5px] font-semibold">{name}</span>
          <span className="flex-none text-[11.5px] text-[var(--ink-soft)]">
            · {count} {activeCity ? `in ${activeCity}` : "on the map"}
          </span>
        </button>
        <button onClick={onClear} className="win-btn flex-none" title="Clear this scope">
          ×
        </button>
      </div>

      {cities.length > 1 && (
        <div
          className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--line)] px-1.5 py-1"
          style={{ background: "color-mix(in srgb, var(--card) 92%, transparent)", backdropFilter: "blur(12px)", boxShadow: "var(--shadow)" }}
        >
          <button
            onClick={() => onCity(null)}
            className="flex-none rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
            style={
              activeCity === null
                ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
                : { color: "var(--ink-soft)" }
            }
          >
            Everywhere
          </button>
          {cities.map((c) => (
            <button
              key={c.name}
              onClick={() => onCity(c.name)}
              className="flex-none rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
              style={
                activeCity === c.name
                  ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
                  : { color: "var(--ink-soft)" }
              }
            >
              {c.name} <span className="opacity-60">{c.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
