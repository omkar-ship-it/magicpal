"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

export type DockSize = "min" | "side" | "wide" | "full";

export type DockTab = {
  /** Unique per open tab. */
  key: string;
  emoji: string;
  title: string;
};

const MIN_W = 340;
const MAX_W = 980;

/**
 * The window manager for everything that opens over the map: feeds,
 * event pages, company pages. Several can be open at once as tabs — switch
 * between them, full-screen one, minimise the lot to a taskbar, or close
 * them all and you're back to the bare map.
 */
export default function PanelDock({
  tabs,
  activeKey,
  size,
  width,
  onActivate,
  onClose,
  onCloseAll,
  onSize,
  onWidth,
  children,
}: {
  tabs: DockTab[];
  activeKey: string;
  size: DockSize;
  width: number;
  onActivate: (key: string) => void;
  onClose: (key: string) => void;
  onCloseAll: () => void;
  onSize: (s: DockSize) => void;
  onWidth: (w: number) => void;
  children: ReactNode;
}) {
  const dragging = useRef(false);

  const onDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      onWidth(Math.min(MAX_W, Math.max(MIN_W, window.innerWidth - e.clientX)));
    },
    [onWidth]
  );

  useEffect(() => {
    function up() {
      dragging.current = false;
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", up);
    };
  }, [onDragMove]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseAll();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCloseAll]);

  if (tabs.length === 0) return null;

  // Minimised: everything stays open, collapsed to a taskbar so the map is clear.
  if (size === "min") {
    return (
      <div
        className="fixed bottom-0 right-4 z-[1300] flex max-w-[min(680px,calc(100vw-32px))] items-center gap-1 overflow-x-auto rounded-t-2xl border border-[var(--line)] px-2 py-1.5"
        style={{ background: "var(--card)", boxShadow: "var(--shadow-lift)" }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              onActivate(t.key);
              onSize("side");
            }}
            className="flex max-w-[180px] flex-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold hover:bg-[var(--sunk)]"
            title={t.title}
          >
            <span className="flex-none">{t.emoji}</span>
            <span className="truncate">{t.title}</span>
          </button>
        ))}
        <button onClick={onCloseAll} className="win-btn flex-none" title="Close all">
          ×
        </button>
      </div>
    );
  }

  const frame =
    size === "full"
      ? { inset: 0 as const, width: "100%" }
      : { top: 0, bottom: 0, right: 0, width: size === "wide" ? Math.min(MAX_W, Math.max(width, 680)) : width };
  const wide = size !== "side";

  // No modal backdrop: the toolbar, the people list and the map all stay
  // live while panels are open, so you can line up the next feed without
  // closing this one first.
  return (
    <>
      <div
        className="fixed z-[1300] flex flex-col border-l border-[var(--line)]"
        style={{ ...frame, background: "var(--bg)", boxShadow: "var(--shadow-lift)" }}
      >
        {size !== "full" && (
          <div
            onMouseDown={() => {
              dragging.current = true;
              document.body.style.userSelect = "none";
            }}
            title="Drag to resize"
            className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize hover:bg-[var(--brand)]"
          />
        )}

        {/* tab strip + window buttons */}
        <div className="flex flex-none items-center gap-1 border-b border-[var(--line)] px-3 py-1.5" style={{ background: "var(--card)" }}>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const on = t.key === activeKey;
              return (
                <div
                  key={t.key}
                  className="group flex max-w-[190px] flex-none items-center gap-1 rounded-lg pl-2 pr-1 transition-colors"
                  style={on ? { background: "var(--sunk)" } : undefined}
                >
                  <button
                    onClick={() => onActivate(t.key)}
                    className="flex min-w-0 items-center gap-1.5 py-1.5 text-[12.5px]"
                    style={{ fontWeight: on ? 600 : 500, color: on ? "var(--ink)" : "var(--ink-soft)" }}
                    title={t.title}
                  >
                    <span className="flex-none">{t.emoji}</span>
                    <span className="truncate">{t.title}</span>
                  </button>
                  <button
                    onClick={() => onClose(t.key)}
                    className="grid h-5 w-5 flex-none place-items-center rounded text-[12px] text-[var(--ink-soft)] opacity-0 transition-opacity hover:bg-[var(--card)] hover:text-[var(--ink)] group-hover:opacity-100"
                    title="Close tab"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-none items-center gap-0.5">
            <button onClick={() => onSize("min")} className="win-btn" title="Minimise">
              ▾
            </button>
            <button onClick={() => onSize(size === "wide" ? "side" : "wide")} className="win-btn" title={size === "wide" ? "Narrow" : "Expand"}>
              {size === "wide" ? "▸" : "◂"}
            </button>
            <button onClick={() => onSize(size === "full" ? "side" : "full")} className="win-btn" title={size === "full" ? "Restore" : "Full screen"}>
              {size === "full" ? "⤡" : "⤢"}
            </button>
            <button onClick={onCloseAll} className="win-btn" title="Close all — back to the map">
              ×
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-5 ${size === "full" ? "mx-auto w-full max-w-3xl" : ""}`}>{children}</div>

        {!wide && tabs.length > 1 && (
          <div className="flex-none border-t border-[var(--line)] px-3 py-1.5 text-[11px] text-[var(--ink-soft)]">
            {tabs.length} open — × closes all
          </div>
        )}
      </div>
    </>
  );
}
