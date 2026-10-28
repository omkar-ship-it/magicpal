"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  padded = true,
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
  /** Off for a page that paints its own canvas edge to edge. */
  padded?: boolean;
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
   * Dragged and resized, on top of the size presets.
   *
   * A panel you can only snap to three widths is furniture; one you can
   * put where you want is a window, and a product whose panels behave like
   * windows is one people arrange to suit the thing they are doing. The
   * presets stay — they are the fast path — and a drag simply offsets from
   * wherever the preset put it.
   *
   * Desktop only. On a phone this is a bottom sheet and dragging it
   * sideways would be answering a question nobody asked with a gesture
   * that fights the scroll.
   */
  const grab = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const stretch = useRef<{ px: number; py: number; w: number; h: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  /**
   * Both are stamped with the preset they were made under, and read back
   * only while that preset still applies.
   *
   * A new preset is a fresh intent — it should land where the preset says,
   * not where the last drag left it — and the obvious way to do that is to
   * clear the offsets in an effect when `size` changes, which the React
   * Compiler refuses because it cascades a second render. Deriving it needs
   * no effect and cannot get out of step.
   */
  const [dragged, setDragged] = useState<{ at: PageSize; x: number; y: number } | null>(null);
  const [boxed, setBoxed] = useState<{ at: PageSize; w: number; h: number } | null>(null);
  const drag = dragged?.at === size ? dragged : { x: 0, y: 0 };
  const box = boxed?.at === size ? boxed : null;

  function startDrag(e: React.PointerEvent) {
    if (window.matchMedia("(max-width: 639px)").matches) return;
    if ((e.target as HTMLElement).closest("button")) return;
    grab.current = { px: e.clientX, py: e.clientY, x: drag.x, y: drag.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDrag(e: React.PointerEvent) {
    const g = grab.current;
    if (!g) return;
    setDragged({ at: size, x: g.x + (e.clientX - g.px), y: g.y + (e.clientY - g.py) });
  }
  function endDrag() {
    grab.current = null;
    stretch.current = null;
  }

  function startResize(e: React.PointerEvent) {
    const el = frameRef.current;
    if (!el) return;
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    stretch.current = { px: e.clientX, py: e.clientY, w: r.width, h: r.height };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onResize(e: React.PointerEvent) {
    const st = stretch.current;
    if (!st) return;
    setBoxed({
      at: size,
      // The panel is anchored to its right edge, so dragging the grip left
      // has to grow it rather than shrink it.
      w: Math.max(320, st.w - (e.clientX - st.px)),
      h: Math.max(240, st.h + (e.clientY - st.py)),
    });
  }

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
      ref={frameRef}
      className={`panel-enter fixed z-[1300] flex flex-col overflow-hidden rounded-3xl border border-[var(--line)] ${frame}`}
      style={{
        background: "color-mix(in srgb, var(--card) 97%, transparent)",
        backdropFilter: "blur(16px)",
        boxShadow: "var(--shadow-lift)",
        /**
         * `translate`, not `transform`.
         *
         * `.panel-enter` animates `transform` with `both`, so the final
         * keyframe keeps applying it forever and an inline `transform`
         * never wins — the panel simply refused to move. The independent
         * `translate` property composes with the animation instead of
         * fighting it.
         */
        translate: drag.x || drag.y ? `${drag.x}px ${drag.y}px` : undefined,
        ...(box ? { width: box.w, height: box.h, top: undefined } : null),
      }}
    >
      {/* Grab handle — the affordance that tells a thumb this is a sheet. */}
      <div className="flex-none pt-2 sm:hidden">
        <span className="mx-auto block h-1 w-9 rounded-full" style={{ background: "var(--line)" }} />
      </div>

      <div
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex flex-none cursor-grab items-center gap-1.5 border-b border-[var(--line)] px-3 py-2.5 active:cursor-grabbing sm:px-4"
      >
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

      <div
        className={`min-h-0 flex-1 ${padded ? "overflow-y-auto p-4 pb-[88px] sm:pb-4" : "overflow-hidden"} ${
          padded && size === "full" ? "mx-auto w-full max-w-3xl" : ""
        }`}
      >
        {children}
      </div>

      {/* The grip. Bottom-left, because the panel hangs off the right edge
          and a corner that runs off the screen is a corner nobody can grab. */}
      <button
        type="button"
        onPointerDown={startResize}
        onPointerMove={onResize}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="Resize"
        className="absolute bottom-0 left-0 hidden h-5 w-5 cursor-nesw-resize sm:block"
        style={{ touchAction: "none" }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style={{ color: "var(--line)" }}>
          <path d="M3 17h14M3 17v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      </button>
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
