"use client";

import { useEffect, type ReactNode } from "react";

export type PageSize = "side" | "wide" | "full";

/**
 * A feed, event, company or chat page — floating over the map with air on
 * every side rather than welded to an edge, so the map stays the surface
 * everything sits on.
 */
export default function FloatingPage({
  title,
  emoji,
  canGoBack,
  size,
  onBack,
  onClose,
  onMinimise,
  onSize,
  children,
}: {
  title: string;
  emoji: string;
  canGoBack: boolean;
  size: PageSize;
  onBack: () => void;
  onClose: () => void;
  /** Stands the page down while leaving its scope on the map. Absent = no minimise affordance. */
  onMinimise?: () => void;
  onSize: (s: PageSize) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const frame =
    size === "full"
      ? "inset-3 sm:inset-5"
      : size === "wide"
        ? "right-3 top-3 bottom-[104px] w-[min(760px,calc(100vw-24px))] sm:right-5 sm:top-5"
        : "right-3 top-3 bottom-[104px] w-[min(430px,calc(100vw-24px))] sm:right-5 sm:top-5";

  return (
    <div
      className={`fixed z-[1300] flex flex-col overflow-hidden rounded-3xl border border-[var(--line)] ${frame}`}
      style={{ background: "color-mix(in srgb, var(--card) 95%, transparent)", backdropFilter: "blur(14px)", boxShadow: "var(--shadow-lift)" }}
    >
      <div className="flex flex-none items-center gap-2 border-b border-[var(--line)] px-4 py-2.5">
        {canGoBack && (
          <button onClick={onBack} className="text-[12.5px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]">
            ←
          </button>
        )}
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">
          {emoji} {title}
        </span>
        <div className="flex flex-none items-center gap-0.5">
          {onMinimise && (
            <button onClick={onMinimise} className="win-btn" title="Minimise — keep these people on the map">
              ▾
            </button>
          )}
          <button onClick={() => onSize(size === "wide" ? "side" : "wide")} className="win-btn" title={size === "wide" ? "Narrow" : "Expand"}>
            {size === "wide" ? "▸" : "◂"}
          </button>
          <button onClick={() => onSize(size === "full" ? "side" : "full")} className="win-btn" title={size === "full" ? "Restore" : "Full screen"}>
            {size === "full" ? "⤡" : "⤢"}
          </button>
          <button onClick={onClose} className="win-btn" title="Close — back to the map">
            ×
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 ${size === "full" ? "mx-auto w-full max-w-3xl" : ""}`}>{children}</div>
    </div>
  );
}
