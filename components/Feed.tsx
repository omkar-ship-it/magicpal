"use client";

import { useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import { timeAgo, type MockPost, type PostKind } from "@/lib/feedData";
import { entityById } from "@/lib/networks";

const COMPOSE_KINDS: Array<{ kind: PostKind; label: string; emoji: string; placeholder: string }> = [
  { kind: "update", label: "Update", emoji: "✍️", placeholder: "Share an update…" },
  { kind: "career", label: "Career update", emoji: "💼", placeholder: "New role, promotion, or a move — what changed?" },
  { kind: "job", label: "Hiring", emoji: "📣", placeholder: "What's the role, and who should apply?" },
  { kind: "ask", label: "Ask", emoji: "🙋", placeholder: "What do you need — an intro, advice, a second opinion?" },
];

function PollBlock({ poll, voted, onVote }: { poll: NonNullable<MockPost["poll"]>; voted?: string; onVote: (optionId: string) => void }) {
  const total = poll.options.reduce((n, o) => n + o.votes, 0) + (voted ? 1 : 0);
  return (
    <div className="mt-2.5 rounded-xl border border-[var(--line)] p-3">
      <p className="text-[12.5px] font-semibold">{poll.question}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {poll.options.map((o) => {
          const votes = o.votes + (voted === o.id ? 1 : 0);
          const pct = total ? Math.round((votes / total) * 100) : 0;
          const mine = voted === o.id;
          return (
            <button
              key={o.id}
              onClick={() => !voted && onVote(o.id)}
              disabled={Boolean(voted)}
              className="relative overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-[12px]"
              style={{ borderColor: mine ? "var(--brand)" : "var(--line)", cursor: voted ? "default" : "pointer" }}
            >
              {voted && (
                <span
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${pct}%`, background: mine ? "color-mix(in srgb, var(--brand) 16%, transparent)" : "var(--sunk)" }}
                />
              )}
              <span className="relative flex justify-between gap-2">
                <span className="font-medium">{o.label}</span>
                {voted && <span className="font-semibold text-[var(--ink-soft)]">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--ink-soft)]">
        {total.toLocaleString()} votes{voted ? " · you voted" : ""}
      </p>
    </div>
  );
}

function PostCard({
  post,
  showSource,
  liked,
  extraComments,
  voted,
  onToggleLike,
  onComment,
  onVote,
  onOpenEvent,
  onOpenEntity,
}: {
  post: MockPost;
  showSource: boolean;
  liked: boolean;
  extraComments: MockPost["comments"];
  voted?: string;
  onToggleLike: (id: string) => void;
  onComment: (id: string, body: string) => void;
  onVote: (id: string, optionId: string) => void;
  onOpenEvent: (eventId: string) => void;
  onOpenEntity: (entityId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const comments = [...post.comments, ...extraComments];
  const source = showSource ? entityById(post.entityId) : undefined;

  function submit() {
    const body = draft.trim();
    if (!body) return;
    onComment(post.id, body);
    setDraft("");
    setOpen(true);
  }

  return (
    <div className="card p-3.5">
      {source && (
        <button
          onClick={() => onOpenEntity(source.id)}
          className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-[var(--ink-soft)] hover:text-[var(--brand)]"
        >
          {source.emoji} {source.name} ›
        </button>
      )}

      <div className="flex items-start gap-2.5">
        <span className="avatar h-10 w-10 flex-none text-[12px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl(post.author)} alt="" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">{post.author}</p>
          <p className="truncate text-[11.5px] text-[var(--ink-soft)]">{post.authorHeadline}</p>
          <p className="text-[11px] text-[var(--ink-soft)]">
            {timeAgo(post.minutesAgo)}
            {post.kind === "career" && " · career update"}
            {post.kind === "job" && " · hiring"}
            {post.kind === "ask" && " · asking the network"}
          </p>
        </div>
      </div>

      <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-5">{post.body}</p>

      {post.highlight && (
        <div
          className="mt-2.5 flex items-center gap-3 rounded-xl p-3"
          style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--brand) 12%, var(--card)), var(--sunk))" }}
        >
          <span className="text-[24px] leading-none">{post.highlight.emoji}</span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{post.highlight.title}</p>
            <p className="truncate text-[11.5px] text-[var(--ink-soft)]">{post.highlight.subtitle}</p>
          </div>
        </div>
      )}

      {post.job && (
        <div className="mt-2.5 rounded-xl border border-[var(--line)] p-3">
          <p className="text-[13px] font-semibold">{post.job.title}</p>
          <p className="text-[11.5px] text-[var(--ink-soft)]">
            {post.job.company} · {post.job.location}
          </p>
          <button className="btn btn-ghost btn-sm mt-2">Ask for a referral</button>
        </div>
      )}

      {post.poll && <PollBlock poll={post.poll} voted={voted} onVote={(o) => onVote(post.id, o)} />}

      {post.eventId && (
        <button
          onClick={() => onOpenEvent(post.eventId!)}
          className="mt-2.5 flex w-full items-center gap-2 rounded-xl border border-[var(--line)] p-3 text-left transition-colors hover:border-[var(--brand)]"
        >
          <span className="text-[20px]">📅</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold">Open the event page</span>
            <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">Agenda, speakers, and tickets</span>
          </span>
          <span className="flex-none text-[var(--ink-soft)]">→</span>
        </button>
      )}

      <div className="mt-2.5 flex items-center gap-1 border-t border-[var(--line)] pt-2">
        <button
          onClick={() => onToggleLike(post.id)}
          className="rounded-lg px-2 py-1 text-[12px] font-semibold transition-colors hover:bg-[var(--sunk)]"
          style={{ color: liked ? "var(--brand)" : "var(--ink-soft)" }}
        >
          {liked ? "♥" : "♡"} {(post.likes + (liked ? 1 : 0)).toLocaleString()}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg px-2 py-1 text-[12px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--sunk)]"
        >
          💬 {comments.length}
        </button>
      </div>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {comments.map((cm) => (
            <div key={cm.id} className="flex gap-2">
              <span className="avatar h-7 w-7 flex-none text-[10px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl(cm.author)} alt="" />
              </span>
              <div className="min-w-0 rounded-xl px-2.5 py-1.5" style={{ background: "var(--sunk)" }}>
                <p className="text-[12px] font-semibold leading-tight">{cm.author}</p>
                <p className="text-[11px] text-[var(--ink-soft)]">{cm.authorHeadline}</p>
                <p className="mt-0.5 text-[12.5px] leading-5">{cm.body}</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--ink-soft)]">{timeAgo(cm.minutesAgo)}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              className="input text-[12.5px]"
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 300))}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <button onClick={submit} disabled={!draft.trim()} className="btn btn-ghost btn-sm flex-none">
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One feed, reused for a single community and for the aggregated "catch up"
 * view across everything you're in. Posting, liking, commenting and voting
 * are prototype-only: they live in memory for the session.
 */
export default function Feed({
  posts,
  entityName,
  canPost,
  showSource,
  likes,
  comments,
  votes,
  onPost,
  onToggleLike,
  onComment,
  onVote,
  onOpenEvent,
  onOpenEntity,
  postingAs,
}: {
  posts: MockPost[];
  entityName: string;
  canPost: boolean;
  /** The aggregated feed labels each post with the community it came from. */
  showSource?: boolean;
  likes: Set<string>;
  comments: Record<string, MockPost["comments"]>;
  votes: Record<string, string>;
  onPost: (body: string, kind: PostKind) => void;
  onToggleLike: (id: string) => void;
  onComment: (id: string, body: string) => void;
  onVote: (id: string, optionId: string) => void;
  onOpenEvent: (eventId: string) => void;
  onOpenEntity: (entityId: string) => void;
  /** Set when you're an admin posting in your community's name. */
  postingAs?: string;
}) {
  const [kind, setKind] = useState<PostKind>("update");
  const [draft, setDraft] = useState("");
  const active = COMPOSE_KINDS.find((k) => k.kind === kind) ?? COMPOSE_KINDS[0];

  function submit() {
    const body = draft.trim();
    if (!body) return;
    onPost(body, kind);
    setDraft("");
    setKind("update");
  }

  return (
    <div>
      {canPost ? (
        <div className="card p-3">
          <div className="flex flex-wrap gap-1.5">
            {COMPOSE_KINDS.map((k) => (
              <button
                key={k.kind}
                onClick={() => setKind(k.kind)}
                className="pill"
                style={
                  kind === k.kind
                    ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)", border: "1px solid var(--brand)" }
                    : { background: "var(--sunk)", color: "var(--ink-soft)", border: "1px solid transparent" }
                }
              >
                {k.emoji} {k.label}
              </button>
            ))}
          </div>
          <textarea
            className="input mt-2 text-[12.5px]"
            rows={2}
            placeholder={active.placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 600))}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--ink-soft)]">
              {postingAs ? `Posting as ${postingAs}` : `Posting to ${entityName}`}
            </p>
            <button onClick={submit} disabled={!draft.trim()} className="btn btn-primary btn-sm">
              Post
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[12.5px] text-[var(--ink-soft)]">Join {entityName} to post here.</p>
      )}

      {posts.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--ink-soft)]">Nothing posted here yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              showSource={Boolean(showSource)}
              liked={likes.has(p.id)}
              extraComments={comments[p.id] ?? []}
              voted={votes[p.id]}
              onToggleLike={onToggleLike}
              onComment={onComment}
              onVote={onVote}
              onOpenEvent={onOpenEvent}
              onOpenEntity={onOpenEntity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
