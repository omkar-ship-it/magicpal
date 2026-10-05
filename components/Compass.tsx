"use client";

export type CompassLine = {
  id: string;
  emoji: string;
  headline: string;
  detail: string;
  onClick: () => void;
};

/**
 * What the map knows about your world, before you ask it anything.
 *
 * Every incumbent opens on a blank search box and waits. The one thing a
 * map-plus-membership graph can do that a feed can't is answer "what's
 * true near me right now" without a query — who from your networks is
 * close, what's on this week, who's waiting on a reply. Each line is a
 * one-tap jump into that already-filtered view.
 */
export default function Compass({ place, lines, onDismiss }: { place: string; lines: CompassLine[]; onDismiss: () => void }) {
  if (lines.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[104px] z-[1340] flex justify-center px-3">
      <div
        className="pointer-events-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-[var(--line)]"
        style={{ background: "color-mix(in srgb, var(--card) 94%, transparent)", backdropFilter: "blur(14px)", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="flex items-center gap-2 px-3.5 pb-1.5 pt-3">
          <span className="text-[13px] font-semibold">Your world right now</span>
          {place && <span className="truncate text-[11px] text-[var(--ink-soft)]">· {place}</span>}
          <button onClick={onDismiss} className="win-btn ml-auto flex-none" title="Dismiss">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {lines.map((l) => (
            <button
              key={l.id}
              onClick={l.onClick}
              className="flex items-center gap-2.5 rounded-2xl p-2 text-left transition-colors hover:bg-[var(--sunk)]"
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl text-[16px]" style={{ background: "var(--sunk)" }}>
                {l.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold leading-tight">{l.headline}</span>
                <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">{l.detail}</span>
              </span>
              <span className="flex-none text-[var(--ink-soft)]">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
