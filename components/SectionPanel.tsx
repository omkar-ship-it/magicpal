"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { avatarUrl } from "@/lib/avatar";
import { MOCK_ACCEPTED_NAMES, MOCK_THREADS } from "@/lib/chatData";
import { MOCK_COMPANIES, MOCK_EVENTS } from "@/lib/prototypeData";
import { HOME_FEED_ID, PUBLIC_ENTITY_ID, PLACED_ENTITIES, entityById, type MockEntity } from "@/lib/networks";
import type { Profile } from "./MapPrimitives";
import { SECTIONS, type Section } from "./DockBar";

export type PanelSize = "side" | "wide" | "full";

const MIN_W = 340;
const MAX_W = 980;

function Row({
  emoji,
  title,
  subtitle,
  meta,
  photo,
  onClick,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  photo?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-[var(--brand)]">
      {photo ? (
        <span className="avatar h-10 w-10 flex-none text-[12px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" />
        </span>
      ) : (
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl text-[18px]" style={{ background: "var(--sunk)" }}>
          {emoji}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold leading-tight">{title}</span>
        {subtitle && <span className="block truncate text-[12px] text-[var(--ink-soft)]">{subtitle}</span>}
        {meta && <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-soft)]">{meta}</span>}
      </span>
      <span className="flex-none text-[var(--ink-soft)]">›</span>
    </button>
  );
}

/**
 * The one panel. Whichever of the five dock sections is open renders here,
 * each with its own list, and detail pushed on top of that list rather than
 * into a second window. Closing it returns to the bare map.
 */
export default function SectionPanel({
  section,
  stack,
  size,
  width,
  myNetworks,
  people,
  onOpenStack,
  onBack,
  onClose,
  onSize,
  onWidth,
  controls,
  detail,
}: {
  section: Section;
  /** Ids drilled into within this section — empty means the list. */
  stack: string[];
  size: PanelSize;
  width: number;
  myNetworks: MockEntity[];
  people: Profile[];
  onOpenStack: (id: string) => void;
  onBack: () => void;
  onClose: () => void;
  onSize: (s: PanelSize) => void;
  onWidth: (w: number) => void;
  /** Map controls shown above the Network list — filters, radius, drop a pin. */
  controls?: ReactNode;
  /** Rendered instead of the list when something is drilled into. */
  detail: ReactNode;
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
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meta = SECTIONS.find((s) => s.id === section)!;
  const frame =
    size === "full"
      ? { inset: 0 as const, width: "100%" }
      : { top: 0, bottom: 0, right: 0, width: size === "wide" ? Math.min(MAX_W, Math.max(width, 680)) : width };

  function list() {
    switch (section) {
      case "network":
        return (
          <div className="flex flex-col gap-2">
            <Row emoji="🏠" title="Your feed" subtitle="Everything from every community you're in" onClick={() => onOpenStack(HOME_FEED_ID)} />
            <Row emoji="🌍" title="Public Network" subtitle="Everyone on the map — no membership needed" onClick={() => onOpenStack(PUBLIC_ENTITY_ID)} />
            <p className="label mt-2">Your networks ({myNetworks.length})</p>
            {myNetworks.map((n) => (
              <Row
                key={n.id}
                emoji={n.emoji}
                title={n.name}
                subtitle={n.blurbMock}
                meta={`${n.memberCountMock.toLocaleString()} members`}
                onClick={() => onOpenStack(n.id)}
              />
            ))}
          </div>
        );

      case "chats": {
        const threads = MOCK_ACCEPTED_NAMES.map((name) => {
          const p = people.find((x) => x.name === name);
          const msgs = MOCK_THREADS[name] ?? [];
          const last = msgs[msgs.length - 1];
          return { name, p, last };
        });
        return (
          <div className="flex flex-col gap-2">
            {threads.map((t) => (
              <Row
                key={t.name}
                photo={t.p?.photoUrl ?? avatarUrl(t.name)}
                title={t.name}
                subtitle={t.p?.headline ?? undefined}
                meta={t.last ? `${t.last.mine ? "You: " : ""}${t.last.body}` : "Say hello"}
                onClick={() => onOpenStack(t.p?.id ?? t.name)}
              />
            ))}
          </div>
        );
      }

      case "events":
        return (
          <div className="flex flex-col gap-2">
            {MOCK_EVENTS.map((e) => {
              const host = e.hostEntityId ? entityById(e.hostEntityId) : undefined;
              return (
                <Row
                  key={e.id}
                  emoji="📅"
                  title={e.name}
                  subtitle={`${e.dateLabel} · ${e.city}`}
                  meta={`${host ? `${host.name} · ` : ""}${e.tickets ? `from ${e.tickets[0].priceLabel}` : "free"} · ${e.attendeesMock.toLocaleString()} attending`}
                  onClick={() => onOpenStack(e.id)}
                />
              );
            })}
          </div>
        );

      case "institutions":
        return (
          <div className="flex flex-col gap-2">
            {PLACED_ENTITIES.map((n) => (
              <Row
                key={n.id}
                emoji={n.emoji}
                title={n.name}
                subtitle={`${n.label}${n.place ? ` · ${n.place.city}` : ""}`}
                meta={`${n.memberCountMock.toLocaleString()} members`}
                onClick={() => onOpenStack(n.id)}
              />
            ))}
          </div>
        );

      case "companies":
        return (
          <div className="flex flex-col gap-2">
            {MOCK_COMPANIES.map((c) => (
              <Row
                key={c.id}
                emoji="🏢"
                title={c.name}
                subtitle={`${c.industry} · ${c.city}`}
                meta={`${c.sizeLabel} · ${c.openRoles.length} open roles`}
                onClick={() => onOpenStack(c.id)}
              />
            ))}
          </div>
        );
    }
  }

  return (
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

      <div className="flex flex-none items-center gap-2 border-b border-[var(--line)] px-4 py-2.5" style={{ background: "var(--card)" }}>
        {stack.length > 0 ? (
          <button onClick={onBack} className="text-[12.5px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]">
            ← Back
          </button>
        ) : (
          <span className="text-[12.5px] font-semibold">
            {meta.emoji} {meta.label}
          </span>
        )}
        <div className="ml-auto flex flex-none items-center gap-0.5">
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

      <div className={`flex-1 overflow-y-auto p-4 ${size === "full" ? "mx-auto w-full max-w-3xl" : ""}`}>
        {stack.length > 0 ? (
          detail
        ) : (
          <>
            {controls}
            {list()}
          </>
        )}
      </div>
    </div>
  );
}
