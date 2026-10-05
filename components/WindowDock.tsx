"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

export type DockTab = { key: string; emoji: string; title: string };
export type PanelSize = "side" | "wide" | "full";

const MIN_W = 340;
const MAX_W = 980;

/**
 * One window system for everything that opens over the map — feeds, event
 * pages, company pages, and chats. They all live as pills in a dock at the
 * bottom centre; clicking one raises it into the right-hand panel, clicking
 * it again puts it back down. The dock itself collapses to a single icon.
 *
 * Previously there were two competing minimised states (a tab taskbar and a
 * separate floating chat), which is the thing this replaces.
 */
export default function WindowDock({
  tabs,
  activeKey,
  size,
  width,
  collapsed,
  onActivate,
  onMinimise,
  onClose,
  onCloseAll,
  onSize,
  onWidth,
  onCollapsedChange,
  children,
}: {
  tabs: DockTab[];
  /** "" means everything is docked and the panel is closed. */
  activeKey: string;
  size: PanelSize;
  width: number;
  collapsed: boolean;
  onActivate: (key: string) => void;
  onMinimise: () => void;
  onClose: (key: string) => void;
  onCloseAll: () => void;
  onSize: (s: PanelSize) => void;
  onWidth: (w: number) => void;
  onCollapsedChange: (v: boolean) => void;
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
      if (e.key === "Escape") onMinimise();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMinimise]);

  if (tabs.length === 0) return null;

  const active = tabs.find((t) => t.key === activeKey);
  const frame =
    size === "full"
      ? { inset: 0 as const, width: "100%" }
      : { top: 0, bottom: 0, right: 0, width: size === "wide" ? Math.min(MAX_W, Math.max(width, 680)) : width };

  return (
    <>
      {active && (
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

          <div className="flex flex-none items-center gap-2 border-b border-[var(--line)] px-4 py-2" style={{ background: "var(--card)" }}>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">
              {active.emoji} {active.title}
            </span>
            <div className="flex flex-none items-center gap-0.5">
              <button onClick={onMinimise} className="win-btn" title="Minimise to the dock">
                ▾
              </button>
              <button onClick={() => onSize(size === "wide" ? "side" : "wide")} className="win-btn" title={size === "wide" ? "Narrow" : "Expand"}>
                {size === "wide" ? "▸" : "◂"}
              </button>
              <button onClick={() => onSize(size === "full" ? "side" : "full")} className="win-btn" title={size === "full" ? "Restore" : "Full screen"}>
                {size === "full" ? "⤡" : "⤢"}
              </button>
              <button onClick={() => onClose(active.key)} className="win-btn" title="Close">
                ×
              </button>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto p-5 ${size === "full" ? "mx-auto w-full max-w-3xl" : ""}`}>{children}</div>
        </div>
      )}

      {/* the dock itself — bottom centre, above the map, never modal */}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[1350] flex justify-center px-3">
        {collapsed ? (
          <button
            onClick={() => onCollapsedChange(false)}
            className="pointer-events-auto relative grid h-12 w-12 place-items-center rounded-full border border-[var(--line)] text-[18px]"
            style={{ background: "var(--card)", boxShadow: "var(--shadow-lift)" }}
            title={`${tabs.length} open`}
          >
            ▴
            <span
              className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ background: "var(--brand)" }}
            >
              {tabs.length}
            </span>
          </button>
        ) : (
          <div
            className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--line)] p-1.5"
            style={{ background: "color-mix(in srgb, var(--card) 96%, transparent)", backdropFilter: "blur(10px)", boxShadow: "var(--shadow-lift)" }}
          >
            {tabs.map((t) => {
              const on = t.key === activeKey;
              return (
                <div
                  key={t.key}
                  className="group flex max-w-[200px] flex-none items-center rounded-xl pl-2.5 pr-1 transition-colors"
                  style={on ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))" } : undefined}
                >
                  <button
                    onClick={() => (on ? onMinimise() : onActivate(t.key))}
                    className="flex min-w-0 items-center gap-1.5 py-2 text-[12.5px]"
                    style={{ fontWeight: on ? 600 : 500, color: on ? "var(--brand)" : "var(--ink-soft)" }}
                    title={on ? "Minimise" : `Open ${t.title}`}
                  >
                    <span className="flex-none">{t.emoji}</span>
                    <span className="truncate">{t.title}</span>
                  </button>
                  <button
                    onClick={() => onClose(t.key)}
                    className="grid h-5 w-5 flex-none place-items-center rounded text-[12px] text-[var(--ink-soft)] opacity-0 transition-opacity hover:text-[var(--ink)] group-hover:opacity-100"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <span className="mx-0.5 h-6 w-px flex-none" style={{ background: "var(--line)" }} />
            <button onClick={onCloseAll} className="win-btn flex-none" title="Close everything">
              ×
            </button>
            <button onClick={() => onCollapsedChange(true)} className="win-btn flex-none" title="Collapse the dock">
              ▾
            </button>
          </div>
        )}
      </div>
    </>
  );
}
