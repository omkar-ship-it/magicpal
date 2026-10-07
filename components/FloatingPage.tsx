"use client";

import { useEffect, type ReactNode } from "react";
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconX } from "./Icons";

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

  /**
   * On a phone this is a bottom sheet, not a floating card: it rises from the
   * bottom edge, leaves the top third of the map visible so you never lose
   * your place in the world, and keeps the dock reachable under your thumb.
   * The desktop behaviour — a card floating to one side — is unchanged.
   */
  const frame =
    size === "full"
      ? "inset-x-0 bottom-0 top-0 rounded-none sm:inset-5 sm:rounded-3xl"
      : size === "wide"
        ? "inset-x-0 bottom-0 top-[34vh] rounded-b-none sm:inset-y-auto sm:bottom-[104px] sm:left-auto sm:right-5 sm:top-5 sm:w-[min(760px,calc(100vw-40px))] sm:rounded-3xl"
        : "inset-x-0 bottom-0 top-[34vh] rounded-b-none sm:inset-y-auto sm:bottom-[104px] sm:left-auto sm:right-5 sm:top-5 sm:w-[min(430px,calc(100vw-40px))] sm:rounded-3xl";

  return (
    <div
      className={`panel-enter fixed z-[1300] flex flex-col overflow-hidden rounded-3xl border border-[var(--line)] ${frame}`}
      style={{ background: "color-mix(in srgb, var(--card) 97%, transparent)", backdropFilter: "blur(16px)", boxShadow: "var(--shadow-lift)" }}
    >
      {/* Grab handle — the affordance that tells a thumb this is a sheet. */}
      <div className="flex-none pt-2 sm:hidden">
        <span className="mx-auto block h-1 w-9 rounded-full" style={{ background: "var(--line)" }} />
      </div>

      <div className="flex flex-none items-center gap-1.5 border-b border-[var(--line)] px-3 py-2.5 sm:px-4">
        {canGoBack && (
          <button onClick={onBack} className="win-btn flex-none" title="Back" aria-label="Back">
            <IconChevronLeft size={15} />
          </button>
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
          {emoji ? <span className="mr-1">{emoji}</span> : null}
          {title}
        </span>
        <div className="flex flex-none items-center gap-0.5">
          {onMinimise && (
            <button onClick={onMinimise} className="win-btn" title="Minimise — keep these people on the map" aria-label="Minimise">
              <IconChevronDown size={15} />
            </button>
          )}
          {/* Width controls are a desktop idea; a phone sheet has one width. */}
          <button
            onClick={() => onSize(size === "wide" ? "side" : "wide")}
            className="win-btn win-btn-wide"
            title={size === "wide" ? "Narrow" : "Widen"}
            aria-label={size === "wide" ? "Narrow" : "Widen"}
          >
            {size === "wide" ? <IconChevronRight size={15} /> : <IconChevronLeft size={15} />}
          </button>
          <button
            onClick={() => onSize(size === "full" ? "side" : "full")}
            className="win-btn"
            title={size === "full" ? "Restore" : "Full screen"}
            aria-label={size === "full" ? "Restore" : "Full screen"}
          >
            <ExpandIcon full={size === "full"} />
          </button>
          <button onClick={onClose} className="win-btn" title="Close — back to the map" aria-label="Close">
            <IconX size={15} />
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 pb-[88px] sm:pb-4 ${size === "full" ? "mx-auto w-full max-w-3xl" : ""}`}>{children}</div>
    </div>
  );
}

function ExpandIcon({ full }: { full: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {full ? (
        <path d="M9 3v6H3M15 21v-6h6M3 15h6v6M21 9h-6V3" />
      ) : (
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      )}
    </svg>
  );
}
