"use client";

import { useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import { ancestorsOf, entityById, expandMembership } from "@/lib/networks";
import {
  cityById,
  everythingFeed,
  memberById,
  postsAt,
  qualifiedName,
  type CirclePost,
  type CirclePostKind,
  type TravelPing,
} from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";

export const EVERYTHING = "__everything";

const KIND_BADGE: Record<CirclePostKind, { label: string; emoji: string }> = {
  update: { label: "Update", emoji: "✍️" },
  career: { label: "Career", emoji: "💼" },
  job: { label: "Hiring", emoji: "📣" },
  ask: { label: "Ask", emoji: "🙋" },
  milestone: { label: "Milestone", emoji: "🎉" },
};

const COMPOSE_KINDS: Array<{ kind: CirclePostKind; label: string; placeholder: string }> = [
  { kind: "update", label: "✍️ Update", placeholder: "Share something with the group…" },
  { kind: "career", label: "💼 Career", placeholder: "New role, a move, something that changed…" },
  { kind: "job", label: "📣 Hiring", placeholder: "What's the role, where, and who should apply?" },
  { kind: "ask", label: "🙋 Ask", placeholder: "What do you need — an intro, advice, a second opinion?" },
];

function ago(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  const d = Math.round(minutes / 1440);
  return d < 7 ? `${d}d` : `${Math.round(d / 7)}w`;
}

/**
 * The feed, at whatever level of the hierarchy you point it at.
 *
 * Two rules do all the work, and they run in opposite directions:
 *
 *   Reading rolls up.  "Everything" merges every node you're in, so an
 *                      institution-wide announcement reaches every class
 *                      without being re-posted into each one.
 *   Writing does not.  You can post at the communities you actually joined,
 *                      never at the ancestors you inherit from them. Reach is
 *                      the thing being gated: a class post reaches 600 people,
 *                      the same words at the institution reach 14,000.
 *
 * And a node's own feed is exclusive — only what was posted *at* that node.
 * Rolling children up would make it identical to "Everything" and bury the
 * institution's voice under whichever class posts most.
 */
export default function CircleFeed({
  me,
  level,
  pings,
  onLevel,
  onOpenMember,
  onOpenCity,
  onOpenPing,
  onCompose,
  onStartMeetup,
}: {
  me: CircleMe;
  /** EVERYTHING, or an entity id. */
  level: string;
  pings: TravelPing[];
  onLevel: (level: string) => void;
  onOpenMember: (id: string) => void;
  onOpenCity: (cityId: string) => void;
  onOpenPing: (ping: TravelPing) => void;
  onCompose: (entityId: string, kind: CirclePostKind, body: string) => void;
  onStartMeetup: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<CirclePostKind>("update");
  const [postAt, setPostAt] = useState(me.entityIds[0]);
  const [open, setOpen] = useState<string | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [mine, setMine] = useState<CirclePost[]>([]);

  // Everything you're in, plus every level above it — the ladder you can read.
  const chain = Array.from(
    new Set(me.entityIds.flatMap((id) => [...ancestorsOf(id).map((a) => a.id), id]))
  ).sort((a, b) => ancestorsOf(a).length - ancestorsOf(b).length);

  const canPostHere = level === EVERYTHING ? me.entityIds.length > 0 : me.entityIds.includes(level);
  const target = level === EVERYTHING ? postAt : level;

  const posts =
    level === EVERYTHING
      ? [...mine, ...everythingFeed(me.entityIds)].sort((a, b) => a.minutesAgo - b.minutesAgo)
      : [...mine.filter((p) => p.entityId === level), ...postsAt(level)].sort((a, b) => a.minutesAgo - b.minutesAgo);

  // Only pings relevant to this level, and soonest first — the question is
  // always "who's about to be near me", never "who travelled once".
  const scope = level === EVERYTHING ? expandMembership(me.entityIds) : new Set([level]);
  const shownPings = pings
    .filter((p) => scope.has(p.entityId) || level === EVERYTHING)
    .slice(0, 8);

  function submit() {
    const body = draft.trim();
    if (!body || !target) return;
    const post: CirclePost = {
      id: `my-${Date.now()}`,
      entityId: target,
      authorId: null,
      kind,
      body,
      minutesAgo: 0,
      likes: 0,
      comments: [],
    };
    setMine((cur) => [{ ...post, authorId: "__me" }, ...cur]);
    onCompose(target, kind, body);
    setDraft("");
  }

  return (
    <div>
      {/* The ladder. "Everything" is the ceiling of this world — there is no
          public network above it to fall back on. */}
      <div className="flex flex-wrap gap-1">
        <LevelChip label="Everything" on={level === EVERYTHING} onClick={() => onLevel(EVERYTHING)} />
        {chain.map((id) => (
          <LevelChip key={id} label={entityById(id)?.name ?? id} on={level === id} onClick={() => onLevel(id)} />
        ))}
      </div>
      <p className="mt-1.5 text-[11.5px] text-[var(--ink-soft)]">
        {level === EVERYTHING
          ? "Everything from every community you're in, newest first."
          : `Posted at ${qualifiedName(level)} — not what its groups below are saying.`}
      </p>

      {/* Compose */}
      <div className="mt-3 rounded-2xl border border-[var(--line)] p-3">
        {canPostHere ? (
          <>
            <div className="flex flex-wrap gap-1">
              {COMPOSE_KINDS.map((k) => (
                <button
                  key={k.kind}
                  onClick={() => setKind(k.kind)}
                  className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
                  style={
                    kind === k.kind
                      ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
                      : { background: "var(--sunk)", color: "var(--ink-soft)" }
                  }
                >
                  {k.label}
                </button>
              ))}
              <button onClick={onStartMeetup} className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                📍 Meetup
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={COMPOSE_KINDS.find((k) => k.kind === kind)!.placeholder}
              rows={2}
              className="mt-2 w-full resize-none rounded-xl bg-[var(--sunk)] p-2.5 text-[13px] outline-none"
            />
            <div className="mt-1.5 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink-soft)]">
                Posting to {entityById(target ?? "")?.name ?? "your community"}
              </span>
              {level === EVERYTHING && me.entityIds.length > 1 && (
                <select value={postAt} onChange={(e) => setPostAt(e.target.value)} className="chip-select flex-none text-[11px]">
                  {me.entityIds.map((id) => (
                    <option key={id} value={id}>
                      {entityById(id)?.name}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={submit} disabled={!draft.trim()} className="btn btn-primary btn-sm flex-none">
                Post
              </button>
            </div>
          </>
        ) : (
          // The write line, said out loud rather than enforced silently.
          <p className="text-[12.5px] leading-5 text-[var(--ink-soft)]">
            You can read {entityById(level)?.name} because you&rsquo;re in a group under it, but posting here reaches everyone in it — that&rsquo;s an
            admin&rsquo;s call. Post to{" "}
            <button onClick={() => onLevel(me.entityIds[0])} className="font-semibold" style={{ color: "var(--brand)" }}>
              {entityById(me.entityIds[0])?.name}
            </button>{" "}
            instead.
          </p>
        )}
      </div>

      {/* Passing through — the thing a map can say and a feed can't. */}
      {shownPings.length > 0 && (
        <div className="mt-4">
          <p className="label">Passing through</p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {shownPings.map((p) => {
              const m = memberById(p.memberId);
              const city = cityById(p.cityId);
              if (!m || !city) return null;
              return (
                <button
                  key={p.id}
                  onClick={() => onOpenPing(p)}
                  className="flex w-full items-center gap-2.5 rounded-2xl border border-[var(--line)] p-2.5 text-left transition-colors hover:border-[var(--brand)]"
                >
                  <span className="avatar h-9 w-9 flex-none text-[11px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl(m.name)} alt="" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold leading-tight">
                      {m.name} → {city.name}
                    </span>
                    <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                      {p.datesLabel} · {p.daysAway <= 0 ? "here now" : `in ${p.daysAway}d`}
                    </span>
                  </span>
                  <span className="flex-none text-[15px]">✈️</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The timeline */}
      <div className="mt-4 flex flex-col gap-2.5">
        {posts.length === 0 && (
          <p className="rounded-2xl p-4 text-center text-[12.5px] text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
            Nothing posted at {entityById(level)?.name ?? "this level"} yet. That&rsquo;s normal this high up — try Everything.
          </p>
        )}
        {posts.slice(0, 60).map((post) => {
          const author = post.authorId && post.authorId !== "__me" ? memberById(post.authorId) : null;
          const isMine = post.authorId === "__me";
          const source = entityById(post.entityId);
          const city = post.cityId ? cityById(post.cityId) : null;
          return (
            <div key={post.id} className="card p-3.5">
              <div className="flex items-start gap-2.5">
                <button onClick={() => author && onOpenMember(author.id)} className="flex-none" disabled={!author}>
                  <span className="avatar h-9 w-9 text-[11px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl(isMine ? me.name : (author?.name ?? source?.name ?? "?"))} alt="" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight">
                    {isMine ? me.name : (author?.name ?? source?.name)}
                    {!author && !isMine && (
                      <span className="ml-1.5 pill" style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}>
                        official
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11.5px] text-[var(--ink-soft)]">
                    {author ? `${author.headline} · ${author.company}` : source?.label}
                    {" · "}
                    {ago(post.minutesAgo)}
                    {level === EVERYTHING && source ? ` · ${source.name}` : ""}
                  </p>
                </div>
                <span className="flex-none text-[11px] text-[var(--ink-soft)]">{KIND_BADGE[post.kind].emoji}</span>
              </div>

              <p className="mt-2 text-[13.5px] leading-5">{post.body}</p>

              {city && (
                // A post about a place can take you there. This is the whole
                // reason the feed lives on a map instead of beside one.
                <button
                  onClick={() => onOpenCity(city.id)}
                  className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
                >
                  📍 {city.name} — show on the map
                </button>
              )}

              <div className="mt-2 flex items-center gap-3 text-[11.5px] text-[var(--ink-soft)]">
                <button
                  onClick={() =>
                    setLiked((cur) => {
                      const next = new Set(cur);
                      if (next.has(post.id)) next.delete(post.id);
                      else next.add(post.id);
                      return next;
                    })
                  }
                  style={liked.has(post.id) ? { color: "var(--brand)", fontWeight: 600 } : undefined}
                >
                  ♡ {post.likes + (liked.has(post.id) ? 1 : 0)}
                </button>
                {post.comments.length > 0 && (
                  <button onClick={() => setOpen((cur) => (cur === post.id ? null : post.id))}>💬 {post.comments.length}</button>
                )}
              </div>

              {open === post.id && (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-[var(--line)] pt-2">
                  {post.comments.map((c) => {
                    const ca = memberById(c.authorId);
                    return (
                      <div key={c.id} className="flex items-start gap-2">
                        <span className="avatar h-7 w-7 flex-none text-[10px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={avatarUrl(ca?.name ?? "?")} alt="" />
                        </span>
                        <p className="min-w-0 text-[12px] leading-4">
                          <button onClick={() => ca && onOpenMember(ca.id)} className="font-semibold">
                            {ca?.name}
                          </button>{" "}
                          {c.body}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LevelChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
      style={on ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" } : { background: "var(--sunk)", color: "var(--ink-soft)" }}
    >
      {label}
    </button>
  );
}
