"use client";

import { useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import {
  HOME_FEED_ID,
  PUBLIC_ENTITY_ID,
  TOP_CLUBS,
  ancestorsOf,
  childGroupsOf,
  childrenOf,
  entityById,
  membersOfEntity,
  type MockPost,
} from "@/lib/networks";
import { MOCK_EVENTS } from "@/lib/prototypeData";
import { MOCK_JOIN_REQUESTS, type PostKind } from "@/lib/feedData";
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
  likes,
  comments,
  votes,
  onToggleLike,
  onComment,
  onVote,
  isMember,
  isAdmin,
  isPending,
  onRequestAccess,
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
  onPost: (entityId: string, body: string, kind: PostKind) => void;
  likes: Set<string>;
  comments: Record<string, import("@/lib/feedData").MockPost["comments"]>;
  votes: Record<string, string>;
  onToggleLike: (id: string) => void;
  onComment: (id: string, body: string) => void;
  onVote: (id: string, optionId: string) => void;
  isMember: boolean;
  /** You run this one — you get the admin strip and post in the community's name. */
  isAdmin: boolean;
  /** You've asked to join an approval-gated community and are waiting. */
  isPending: boolean;
  onRequestAccess: (id: string) => void;
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
  const [tab, setTab] = useState("feed");
  const [joining, setJoining] = useState(false);
  /** Admin decisions on join requests — prototype-only, resets with the session. */
  const [handled, setHandled] = useState<Record<string, "in" | "out">>({});

  const isHome = entityId === HOME_FEED_ID;
  const isPublic = entityId === PUBLIC_ENTITY_ID || isHome;
  const entity = isPublic ? undefined : entityById(entityId);
  if (!isPublic && !entity) return null;

  const title = isHome ? "Your feed" : isPublic ? "Public Network" : entity!.name;
  const emoji = isHome ? "🏠" : isPublic ? "🌍" : entity!.emoji;
  const blurb = isHome
    ? "Everything from the networks, chapters, classes and clubs you're part of — newest first."
    : isPublic
      ? "Every professional visible on MagicPal, anywhere in the world."
      : entity!.blurbMock;
  const memberCount = isPublic ? null : entity!.memberCountMock;
  const trail = isPublic ? [] : ancestorsOf(entityId);
  const groups = isHome ? [] : isPublic ? [{ label: "Independent clubs", items: TOP_CLUBS }] : childGroupsOf(entityId);
  const members = isHome ? [] : membersOfEntity(people, entityId);
  const events = isHome ? [] : MOCK_EVENTS.filter((e) => e.hostEntityId === entityId);
  const tiers = entity?.membershipTiers;
  const access = entity?.access ?? "open";
  // Approval-gated communities keep their feed and member list private until
  // you're in — you can see that Class of 2021 exists, not what's inside it.
  const locked = !isPublic && !isMember && !isAdmin && access === "request";
  const pendingRequests = isAdmin ? MOCK_JOIN_REQUESTS.filter((r) => r.entityId === entityId) : [];

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
        {isHome
          ? "Across every community you're in"
          : isPublic
            ? "Everyone on the map — no membership needed"
            : `${entity!.label}${entity!.place ? ` · ${entity!.place.city}` : ""}`}
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
        {isAdmin && (
          <span className="pill" style={{ background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }}>
            ⭐ You run this
          </span>
        )}
        {!isPublic &&
          !isAdmin &&
          (isMember ? (
            <button onClick={() => onLeave(entityId)} className="btn btn-ghost btn-sm">
              Joined ✓
            </button>
          ) : isPending ? (
            <button disabled className="btn btn-ghost btn-sm">
              Request pending
            </button>
          ) : tiers ? (
            <button onClick={() => setJoining(true)} className="btn btn-primary btn-sm">
              Join — from {tiers[0].priceLabel}
            </button>
          ) : access === "request" ? (
            <button onClick={() => onRequestAccess(entityId)} className="btn btn-primary btn-sm">
              Request access
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

      {isAdmin && (
        <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 5%, var(--card))" }}>
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
            Admin · {title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="pill" style={{ background: "var(--card)", color: "var(--ink-soft)" }}>
              {memberCount?.toLocaleString()} members
            </span>
            <span className="pill" style={{ background: "var(--card)", color: "var(--ink-soft)" }}>
              {posts.length} posts
            </span>
            <span className="pill" style={{ background: "var(--card)", color: "var(--ink-soft)" }}>
              {pendingRequests.filter((r) => !handled[r.id]).length} pending requests
            </span>
          </div>

          {pendingRequests.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="label">Join requests</p>
              {pendingRequests.map((r) => (
                <div key={r.id} className="card p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="avatar h-9 w-9 flex-none text-[11px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl(r.name)} alt="" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold leading-tight">{r.name}</p>
                      <p className="truncate text-[11.5px] text-[var(--ink-soft)]">{r.headline}</p>
                      <p className="mt-1 text-[12px] leading-5">{r.note}</p>
                    </div>
                  </div>
                  {handled[r.id] ? (
                    <p className="mt-2 text-[12px] font-semibold" style={{ color: handled[r.id] === "in" ? "var(--good)" : "var(--ink-soft)" }}>
                      {handled[r.id] === "in" ? "Approved — they're in" : "Declined"}
                    </p>
                  ) : (
                    <div className="mt-2 flex gap-1.5">
                      <button onClick={() => setHandled((h) => ({ ...h, [r.id]: "out" }))} className="btn btn-ghost btn-sm flex-1">
                        Decline
                      </button>
                      <button onClick={() => setHandled((h) => ({ ...h, [r.id]: "in" }))} className="btn btn-primary btn-sm flex-1">
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {locked ? (
        <div className="mt-5 rounded-2xl border border-[var(--line)] p-6 text-center">
          <p className="text-[26px] leading-none">🔒</p>
          <p className="mt-2 text-[14px] font-semibold">{isPending ? "Your request is with the admins" : `${title} is members only`}</p>
          <p className="mt-1 text-[12.5px] text-[var(--ink-soft)]">
            {isPending
              ? "You'll get access to the feed and member list once someone approves it."
              : `The feed and member list are private to ${entity!.label.toLowerCase()} members.`}
          </p>
          {!isPending && (
            <button onClick={() => onRequestAccess(entityId)} className="btn btn-primary btn-sm mt-3">
              Request access
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Sections, not one long scroll — a feed is a place you dwell, a
              roster is a thing you scan, and they shouldn't fight. */}
          <div className="mt-4 flex flex-wrap gap-1 border-b border-[var(--line)] pb-2">
            {[
              { id: "feed", label: "Feed" },
              ...groups.map((g) => ({ id: `g:${g.label}`, label: `${g.label} (${g.items.length})` })),
              { id: "people", label: `People (${members.length})` },
              ...(events.length > 0 ? [{ id: "events", label: `Events (${events.length})` }] : []),
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
                style={
                  tab === t.id
                    ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
                    : { color: "var(--ink-soft)" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "feed" && (
            <div className="mt-4">
              <Feed
                posts={posts}
                showSource={isHome}
                entityName={isHome ? "your networks" : title}
                canPost={isPublic || isMember || isAdmin}
                likes={likes}
                comments={comments}
                votes={votes}
                onPost={(body, kind) => onPost(entityId, body, kind)}
                onToggleLike={onToggleLike}
                onComment={onComment}
                onVote={onVote}
                onOpenEvent={onOpenEvent}
                onOpenEntity={onOpen}
                postingAs={isAdmin ? title : undefined}
              />
            </div>
          )}

          {groups.map(
            (g) =>
              tab === `g:${g.label}` && (
                <div key={g.label} className={`mt-4 grid gap-2 ${wide ? "sm:grid-cols-2" : ""}`}>
                  {g.items.map((c) => (
                    <button key={c.id} onClick={() => onOpen(c.id)} className="card p-3 text-left transition-colors hover:border-[var(--brand)]">
                      <p className="text-[13.5px] font-semibold leading-tight">
                        {c.emoji} {c.name}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--ink-soft)]">{c.blurbMock}</p>
                      <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                        {(c.access ?? "open") === "request" && "🔒 "}
                        {c.memberCountMock.toLocaleString()} members
                        {c.childLabel ? ` · ${childrenOf(c.id).length} ${c.childLabel.toLowerCase()}` : ""} →
                      </p>
                    </button>
                  ))}
                </div>
              )
          )}

          {tab === "events" && (
            <div className={`mt-4 grid gap-2 ${wide ? "sm:grid-cols-2" : ""}`}>
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
          )}

          {tab === "people" && (
            <div className="mt-4">
              {loading ? (
                <p className="text-[13px] text-[var(--ink-soft)]">Loading members from around the world…</p>
              ) : members.length === 0 ? (
                <p className="text-[13px] text-[var(--ink-soft)]">No one here yet.</p>
              ) : (
                <div className={`grid gap-2.5 ${wide ? "sm:grid-cols-2" : ""}`}>
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
          )}
        </>
      )}
    </div>
  );
}
