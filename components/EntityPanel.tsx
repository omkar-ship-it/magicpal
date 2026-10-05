"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PUBLIC_ENTITY_ID,
  TOP_CLUBS,
  ancestorsOf,
  childrenOf,
  entityById,
  membersOfEntity,
  type MockPost,
} from "@/lib/networks";
import { MOCK_EVENTS } from "@/lib/prototypeData";
import { type Profile, type ConnState, ProfileListRow, CalendarIcon } from "./MapPrimitives";
import Feed from "./Feed";

export type PanelSize = "side" | "wide" | "full";

const MIN_W = 340;
const MAX_W = 900;

/**
 * One panel for any node in the tree — the public network, TiE Global, a
 * region, a chapter, a programme, a class, or an independent club. They all
 * render the same way because they're all the same shape; the only thing
 * that changes is what the institution calls its children.
 *
 * Windowed: drag the left edge to resize, expand, go full screen, or close
 * to drop back to the bare map.
 */
export default function EntityPanel({
  entityId,
  depth,
  people,
  loading,
  posts,
  onPost,
  isMember,
  onToggleMembership,
  onOpen,
  onBack,
  onClose,
  size,
  onSize,
  width,
  onWidth,
  conn,
  onConnect,
  onRespond,
  onMessage,
  canAct,
  now,
}: {
  entityId: string;
  depth: number;
  people: Profile[];
  loading?: boolean;
  posts: MockPost[];
  onPost: (entityId: string, body: string) => void;
  isMember: boolean;
  onToggleMembership: () => void;
  onOpen: (id: string) => void;
  onBack: () => void;
  onClose: () => void;
  size: PanelSize;
  onSize: (s: PanelSize) => void;
  width: number;
  onWidth: (w: number) => void;
  conn: Record<string, ConnState>;
  onConnect: (id: string, note?: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  onMessage: (p: Profile) => void;
  canAct: boolean;
  now: number;
}) {
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [rsvped, setRsvped] = useState<Set<string>>(new Set());
  const dragging = useRef(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const isPublic = entityId === PUBLIC_ENTITY_ID;
  const entity = isPublic ? undefined : entityById(entityId);
  if (!isPublic && !entity) return null;

  const title = isPublic ? "Public Network" : entity!.name;
  const emoji = isPublic ? "🌍" : entity!.emoji;
  const label = isPublic ? "Everyone on the map — no membership needed" : entity!.label;
  const blurb = isPublic ? "Every professional visible on MagicPal, anywhere in the world." : entity!.blurbMock;
  const memberCount = isPublic ? null : entity!.memberCountMock;
  const trail = isPublic ? [] : ancestorsOf(entityId);
  const children = isPublic ? TOP_CLUBS : childrenOf(entityId);
  const childLabel = isPublic ? "Independent clubs" : (entity!.childLabel ?? "Groups");
  const members = membersOfEntity(people, entityId);
  const events = MOCK_EVENTS.filter((e) => e.hostEntityId === entityId);

  function toggleRsvp(id: string) {
    setRsvped((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const frame =
    size === "full"
      ? { inset: 0 as const, width: "100%" }
      : { top: 0, bottom: 0, right: 0, width: size === "wide" ? Math.min(MAX_W, Math.max(width, 620)) : width };

  return (
    <>
      <div className="fixed inset-0 z-[1290] bg-black/20" onClick={onClose} />
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

        {/* window chrome */}
        <div className="flex flex-none items-center gap-2 border-b border-[var(--line)] px-5 py-2.5">
          {depth > 1 ? (
            <button onClick={onBack} className="text-[12.5px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]">
              ← Back
            </button>
          ) : (
            <span className="text-[12px] text-[var(--ink-soft)]">{label}</span>
          )}
          <div className="ml-auto flex flex-none items-center gap-0.5">
            <button onClick={() => onSize(size === "wide" ? "side" : "wide")} className="win-btn" title={size === "wide" ? "Narrow" : "Expand"}>
              {size === "wide" ? "▸" : "◂"}
            </button>
            <button onClick={() => onSize(size === "full" ? "side" : "full")} className="win-btn" title={size === "full" ? "Restore" : "Maximise"}>
              {size === "full" ? "⤡" : "⤢"}
            </button>
            <button onClick={onClose} className="win-btn" title="Close — back to the map">
              ×
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-5 ${size === "full" ? "mx-auto w-full max-w-3xl" : ""}`}>
          {trail.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-1 text-[11.5px] text-[var(--ink-soft)]">
              {trail.map((a) => (
                <span key={a.id} className="flex items-center gap-1">
                  <button onClick={() => onOpen(a.id)} className="hover:text-[var(--brand)] hover:underline">
                    {a.name}
                  </button>
                  <span>›</span>
                </span>
              ))}
            </div>
          )}

          <span className="text-[26px] leading-none">{emoji}</span>
          <h2 className="mt-1.5 text-[19px] font-bold leading-tight">{title}</h2>
          {!isPublic && (
            <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
              {entity!.label}
              {entity!.place ? ` · ${entity!.place.city}` : ""}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {memberCount != null && (
              <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                {memberCount.toLocaleString()} members
              </span>
            )}
            {!isPublic && (
              <button onClick={onToggleMembership} className={isMember ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm"}>
                {isMember ? "Joined ✓" : "Join"}
              </button>
            )}
          </div>

          <p className="mt-3 text-[13.5px] leading-5 text-[var(--ink)]">{blurb}</p>

          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <h3 className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Feed</h3>
            <Feed posts={posts} entityName={title} canPost={isPublic || isMember} onPost={(body) => onPost(entityId, body)} />
          </div>

          {children.length > 0 && (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                {childLabel} ({children.length})
              </h3>
              <div className={`mt-2.5 grid gap-2 ${size === "side" ? "" : "sm:grid-cols-2"}`}>
                {children.map((c) => (
                  <button key={c.id} onClick={() => onOpen(c.id)} className="card p-3 text-left transition-colors hover:border-[var(--brand)]">
                    <p className="text-[13.5px] font-semibold leading-tight">
                      {c.emoji} {c.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--ink-soft)]">{c.blurbMock}</p>
                    <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                      {c.memberCountMock.toLocaleString()} members
                      {c.childLabel ? ` · ${childrenOf(c.id).length} ${c.childLabel.toLowerCase()}` : ""} →
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Upcoming events</h3>
              <div className="mt-2.5 flex flex-col gap-2">
                {events.map((ev) => (
                  <div key={ev.id} className="card p-3">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                      style={{ background: "color-mix(in srgb, var(--layer-event) 14%, var(--card))", color: "var(--layer-event)" }}
                    >
                      <CalendarIcon /> Event
                    </span>
                    <p className="mt-1.5 text-[13.5px] font-semibold leading-tight">{ev.name}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{ev.dateLabel}</p>
                    <p className="text-[12px] text-[var(--ink-soft)]">
                      {ev.venue}, {ev.city}
                    </p>
                    <button
                      onClick={() => toggleRsvp(ev.id)}
                      className={rsvped.has(ev.id) ? "btn btn-ghost btn-sm mt-2.5 w-full" : "btn btn-primary btn-sm mt-2.5 w-full"}
                    >
                      {rsvped.has(ev.id) ? "You're going ✓" : "RSVP"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              Members worldwide {members.length > 0 ? `(${members.length})` : ""}
            </h3>
            {loading ? (
              <p className="mt-2 text-[13px] text-[var(--ink-soft)]">Loading members from around the world…</p>
            ) : members.length === 0 ? (
              <p className="mt-2 text-[13px] text-[var(--ink-soft)]">No one here yet.</p>
            ) : (
              <div className={`mt-2.5 grid gap-2.5 ${size === "side" ? "" : "sm:grid-cols-2"}`}>
                {members.map((p) => (
                  <ProfileListRow
                    key={p.id}
                    p={p}
                    conn={conn[p.id]}
                    hoveredId={hoveredMemberId}
                    now={now}
                    canAct={canAct}
                    onHover={setHoveredMemberId}
                    onUnhover={(id) => setHoveredMemberId((cur) => (cur === id ? null : cur))}
                    onConnect={onConnect}
                    onRespond={onRespond}
                    onMessage={onMessage}
                    communityName={isPublic ? undefined : title}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
