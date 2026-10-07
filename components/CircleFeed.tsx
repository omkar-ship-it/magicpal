"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import { ancestorsOf, entityById } from "@/lib/networks";
import {
  cityById,
  everythingFeed,
  memberById,
  postsAt,
  qualifiedName,
  CIRCLE_POSTS,
  type CirclePost,
  type CirclePostKind,
} from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import { IconAsk, IconBriefcase, IconChat, IconHeart, IconMegaphone, IconPin, IconSparkle } from "./Icons";

export const EVERYTHING = "__everything";

function KindIcon({ kind, size = 14 }: { kind: CirclePostKind; size?: number }) {
  if (kind === "career") return <IconBriefcase size={size} />;
  if (kind === "job") return <IconMegaphone size={size} />;
  if (kind === "ask") return <IconAsk size={size} />;
  if (kind === "milestone") return <IconSparkle size={size} />;
  return <IconChat size={size} />;
}

const COMPOSE_KINDS: Array<{ kind: CirclePostKind; label: string; placeholder: string }> = [
  { kind: "update", label: "Update", placeholder: "Share something with the group…" },
  { kind: "career", label: "Career", placeholder: "New role, a move, something that changed…" },
  { kind: "job", label: "Hiring", placeholder: "What's the role, where, and who should apply?" },
  { kind: "ask", label: "Ask", placeholder: "What do you need — an intro, advice, a second opinion?" },
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
  openNetwork,
  onLevel,
  onOpenMember,
  onOpenCity,
  onCompose,
  onStartMeetup,
}: {
  me: CircleMe;
  /** EVERYTHING, or an entity id. */
  level: string;
  /** Open network: one flat feed, because there's no ladder of communities above you. */
  openNetwork?: boolean;
  onLevel: (level: string) => void;
  onOpenMember: (id: string) => void;
  onOpenCity: (cityId: string) => void;
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

  const canPostHere = openNetwork || (level === EVERYTHING ? me.entityIds.length > 0 : me.entityIds.includes(level));
  const target = level === EVERYTHING ? postAt : level;

  const posts = openNetwork
    ? [...mine, ...CIRCLE_POSTS].sort((a, b) => a.minutesAgo - b.minutesAgo)
    : level === EVERYTHING
      ? [...mine, ...everythingFeed(me.entityIds)].sort((a, b) => a.minutesAgo - b.minutesAgo)
      : [...mine.filter((p) => p.entityId === level), ...postsAt(level)].sort((a, b) => a.minutesAgo - b.minutesAgo);

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
      {!openNetwork && (
        <div className="flex flex-wrap gap-1">
          <LevelChip label="Everything" on={level === EVERYTHING} onClick={() => onLevel(EVERYTHING)} />
          {chain.map((id) => (
            <LevelChip key={id} label={entityById(id)?.name ?? id} on={level === id} onClick={() => onLevel(id)} />
          ))}
        </div>
      )}
      <p className={`${openNetwork ? "" : "mt-1.5 "}text-[11.5px] text-[var(--ink-soft)]`}>
        {openNetwork
          ? "Everyone's posts, newest first. No communities to climb — this is the whole network."
          : level === EVERYTHING
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
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
                  style={
                    kind === k.kind
                      ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
                      : { background: "var(--sunk)", color: "var(--ink-soft)" }
                  }
                >
                  <KindIcon kind={k.kind} size={13} /> {k.label}
                </button>
              ))}
              <button
                onClick={onStartMeetup}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
              >
                <IconPin size={13} /> Meetup
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
                Posting to {openNetwork ? "the open network" : (entityById(target ?? "")?.name ?? "your community")}
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
                  <Avatar name={isMine ? me.name : (author?.name ?? source?.name ?? "?")} size={36} />
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
                <span className="flex-none text-[var(--ink-soft)]" title={post.kind}>
                  <KindIcon kind={post.kind} size={15} />
                </span>
              </div>

              <p className="mt-2 text-[13.5px] leading-5">{post.body}</p>

              {city && (
                // A post about a place can take you there. This is the whole
                // reason the feed lives on a map instead of beside one.
                <button
                  onClick={() => onOpenCity(city.id)}
                  className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors hover:text-[var(--brand)]"
                  style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
                >
                  <IconPin size={12} /> {city.name} — show on the map
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
                  className="flex items-center gap-1"
                  style={liked.has(post.id) ? { color: "var(--brand)", fontWeight: 600 } : undefined}
                >
                  <IconHeart size={14} /> {post.likes + (liked.has(post.id) ? 1 : 0)}
                </button>
                {post.comments.length > 0 && (
                  <button onClick={() => setOpen((cur) => (cur === post.id ? null : post.id))} className="flex items-center gap-1">
                    <IconChat size={14} /> {post.comments.length}
                  </button>
                )}
              </div>

              {open === post.id && (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-[var(--line)] pt-2">
                  {post.comments.map((c) => {
                    const ca = memberById(c.authorId);
                    return (
                      <div key={c.id} className="flex items-start gap-2">
                        <Avatar name={ca?.name ?? "?"} size={28} />
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
