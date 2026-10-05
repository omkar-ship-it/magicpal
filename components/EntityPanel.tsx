"use client";

import { useState } from "react";
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
import Checkout, { type CheckoutResult } from "./Checkout";

/**
 * One panel body for any node in the tree — the public network, TiE Global,
 * a region, a chapter, a programme, a class, or an independent club. They
 * all render the same way because they're all the same shape; the only
 * thing that changes is what the institution calls its children.
 *
 * The window frame, tabs and resizing live in PanelDock — this is just the
 * contents.
 */
export default function EntityPanel({
  entityId,
  depth,
  people,
  loading,
  posts,
  onPost,
  isMember,
  membershipTier,
  onJoin,
  onLeave,
  onOpen,
  onOpenEvent,
  onBack,
  wide,
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
  /** Set when this is a paid community you've already paid to join. */
  membershipTier?: CheckoutResult;
  onJoin: (id: string, paid?: CheckoutResult) => void;
  onLeave: (id: string) => void;
  onOpen: (id: string) => void;
  onOpenEvent: (eventId: string) => void;
  onBack: () => void;
  wide: boolean;
  conn: Record<string, ConnState>;
  onConnect: (id: string, note?: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  onMessage: (p: Profile) => void;
  canAct: boolean;
  now: number;
}) {
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const isPublic = entityId === PUBLIC_ENTITY_ID;
  const entity = isPublic ? undefined : entityById(entityId);
  if (!isPublic && !entity) return null;

  const title = isPublic ? "Public Network" : entity!.name;
  const emoji = isPublic ? "🌍" : entity!.emoji;
  const blurb = isPublic ? "Every professional visible on MagicPal, anywhere in the world." : entity!.blurbMock;
  const memberCount = isPublic ? null : entity!.memberCountMock;
  const trail = isPublic ? [] : ancestorsOf(entityId);
  const children = isPublic ? TOP_CLUBS : childrenOf(entityId);
  const childLabel = isPublic ? "Independent clubs" : (entity!.childLabel ?? "Groups");
  const members = membersOfEntity(people, entityId);
  const events = MOCK_EVENTS.filter((e) => e.hostEntityId === entityId);
  const tiers = entity?.membershipTiers;

  return (
    <div>
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

      {depth > 1 && (
        <button onClick={onBack} className="mb-2 text-[12.5px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]">
          ← Back
        </button>
      )}

      <span className="text-[26px] leading-none">{emoji}</span>
      <h2 className="mt-1.5 text-[19px] font-bold leading-tight">{title}</h2>
      <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
        {isPublic ? "Everyone on the map — no membership needed" : `${entity!.label}${entity!.place ? ` · ${entity!.place.city}` : ""}`}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {memberCount != null && (
          <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
            {memberCount.toLocaleString()} members
          </span>
        )}
        {membershipTier && (
          <span className="pill" style={{ background: "color-mix(in srgb, var(--good) 14%, var(--card))", color: "var(--good)" }}>
            {membershipTier.tier.name}
          </span>
        )}
        {!isPublic &&
          (isMember ? (
            <button onClick={() => onLeave(entityId)} className="btn btn-ghost btn-sm">
              Joined ✓
            </button>
          ) : tiers ? (
            <button onClick={() => setJoining(true)} className="btn btn-primary btn-sm">
              Join — from {tiers[0].priceLabel}
            </button>
          ) : (
            <button onClick={() => onJoin(entityId)} className="btn btn-primary btn-sm">
              Join
            </button>
          ))}
      </div>

      {joining && tiers && (
        <div className="mt-3">
          <Checkout
            title={`Join ${title}`}
            subtitle="Membership runs for a year and renews manually."
            tiers={tiers}
            ctaLabel="Join"
            onCancel={() => setJoining(false)}
            onDone={(r) => {
              setJoining(false);
              onJoin(entityId, r);
            }}
          />
        </div>
      )}

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
          <div className={`mt-2.5 grid gap-2 ${wide ? "sm:grid-cols-2" : ""}`}>
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
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Upcoming events ({events.length})</h3>
          <div className={`mt-2.5 grid gap-2 ${wide ? "sm:grid-cols-2" : ""}`}>
            {events.map((ev) => (
              <button key={ev.id} onClick={() => onOpenEvent(ev.id)} className="card p-3 text-left transition-colors hover:border-[var(--brand)]">
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
                <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                  {ev.tickets ? `From ${ev.tickets[0].priceLabel}` : "Free"} · {ev.attendeesMock.toLocaleString()} attending →
                </p>
              </button>
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
          <div className={`mt-2.5 grid gap-2.5 ${wide ? "sm:grid-cols-2" : ""}`}>
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
                onOpenEntity={onOpen}
                communityName={isPublic ? undefined : title}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
