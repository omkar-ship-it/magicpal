"use client";

import { useState } from "react";
import { cityById, type CircleMember } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import { MATCH_KIND, daysUntilNextBatch, matchesFor, type Match } from "@/lib/matching";
import Avatar from "./Avatar";
import { IconAsk, IconCheck, IconClock, IconHeart, IconSend, IconSparkle, IconX } from "./Icons";

/**
 * Three introductions, with reasons.
 *
 * The open map is 1,800 people and the honest problem with it is that
 * browsing is work. This is the opposite surface: a short, dated list of
 * people worth one message each, every one carrying why it was picked and a
 * first line already written.
 *
 * Nothing here shows a score. What it shows is a *kind* of match, which a
 * person can agree or disagree with — and the disagreement is the useful
 * signal. "Not now" and "I know them" feed back; a thumbs-down on 92% tells
 * you nothing.
 */
export default function Matches({
  me,
  pool,
  onOpenMember,
  onMessage,
  onOpenChat,
}: {
  me: CircleMe;
  pool: CircleMember[];
  onOpenMember: (id: string) => void;
  /** Records the message. Deliberately does not navigate — see MatchCard. */
  onMessage: (id: string, opener: string) => void;
  onOpenChat: (id: string) => void;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const matches = matchesFor(me, pool, { limit: 3, exclude: dismissed });
  const days = daysUntilNextBatch();
  const thin = (me.interests ?? []).length === 0 && !(me.helpWith ?? []).length;

  return (
    <div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}>
          <IconSparkle size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold leading-tight">Your introductions</h2>
          <p className="mt-0.5 text-[12px] leading-4 text-[var(--ink-soft)]">
            Three a week, chosen from {pool.length.toLocaleString()} people. Next set in {days} {days === 1 ? "day" : "days"}.
          </p>
        </div>
      </div>

      {/* The matcher is only as good as what it has to go on, and it should
          say so rather than quietly returning weak results. */}
      {thin && (
        <p className="mt-3 rounded-2xl p-3 text-[12.5px] leading-4" style={{ background: "color-mix(in srgb, var(--warn) 10%, var(--card))" }}>
          These are thin because your profile is. Add what you&rsquo;re here for and what you&rsquo;ll answer, and the next set will be about
          people rather than postcodes.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {matches.map((match) => (
          <MatchCard
            key={match.member.id}
            match={match}
            sent={sent.includes(match.member.id)}
            onOpen={() => onOpenMember(match.member.id)}
            onDismiss={() => setDismissed((d) => [...d, match.member.id])}
            onSend={(text) => {
              setSent((s) => [...s, match.member.id]);
              onMessage(match.member.id, text);
            }}
            onOpenChat={() => onOpenChat(match.member.id)}
          />
        ))}
        {matches.length === 0 && (
          <p className="rounded-2xl p-4 text-center text-[12.5px] text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
            That&rsquo;s this week&rsquo;s set. Three more in {days} {days === 1 ? "day" : "days"}.
          </p>
        )}
      </div>

      <p className="mt-4 text-[11.5px] leading-4 text-[var(--ink-soft)]">
        Prototype — these are scored by a rule, not a model. The explanations are real in the sense that they&rsquo;re derived from the two
        profiles; in a live build the same slot would be filled by something that reads them properly.
      </p>
    </div>
  );
}

function MatchCard({
  match,
  sent,
  onOpen,
  onDismiss,
  onSend,
  onOpenChat,
}: {
  match: Match;
  sent: boolean;
  onOpen: () => void;
  onDismiss: () => void;
  onSend: (text: string) => void;
  onOpenChat: () => void;
}) {
  const [draft, setDraft] = useState(match.opener);
  const [editing, setEditing] = useState(false);
  const m = match.member;
  const kind = MATCH_KIND[match.kind];
  const city = cityById(m.cityId);

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center gap-2 px-3.5 pt-3">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
          style={
            match.kind === "mutual"
              ? { background: "var(--brand)", color: "#fff" }
              : { background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }
          }
        >
          {kind.label}
        </span>
        {match.confidence === "worth a look" && (
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Speculative</span>
        )}
        <button onClick={onDismiss} className="win-btn ml-auto flex-none" title="Not now" aria-label="Not now">
          <IconX size={14} />
        </button>
      </div>

      <button onClick={onOpen} className="flex w-full items-center gap-2.5 px-3.5 pt-2 text-left">
        <Avatar name={m.name} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold leading-tight">{m.name}</span>
          <span className="block truncate text-[12px] text-[var(--ink-soft)]">
            {m.headline} · {m.company}
          </span>
          <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">{city?.name}</span>
        </span>
      </button>

      <p className="px-3.5 pt-2.5 text-[13px] leading-5">{match.why}</p>

      {/* The exchange, both ways. A match you can only take from is a match
          most people never act on. */}
      {(match.theyOffer || match.youOffer) && (
        <div className="mx-3.5 mt-2.5 flex flex-col gap-1.5 rounded-xl p-2.5" style={{ background: "var(--sunk)" }}>
          {match.theyOffer && (
            <p className="flex items-start gap-1.5 text-[12px] leading-4">
              <IconAsk size={13} className="mt-0.5 flex-none text-[var(--ink-soft)]" />
              <span>
                They&rsquo;ll talk about <span className="font-semibold">{match.theyOffer}</span>
              </span>
            </p>
          )}
          {match.youOffer && (
            <p className="flex items-start gap-1.5 text-[12px] leading-4">
              <IconHeart size={13} className="mt-0.5 flex-none" style={{ color: "var(--brand)" }} />
              <span>
                You can help with <span className="font-semibold">{match.youOffer}</span>
              </span>
            </p>
          )}
        </div>
      )}

      <div className="px-3.5 pt-2.5">
        <p className="text-[11px] leading-4 text-[var(--ink-soft)]">Picked because {match.basis.slice(0, 3).join(", ")}.</p>
      </div>

      {/* The drafted opener. Editable, never auto-sent — the whole value is
          that the blank page is gone, not that a robot wrote to someone. */}
      <div className="mt-3 border-t border-[var(--line)] p-3.5">
        {sent ? (
          // Sending stays put. You're working through a short batch, and
          // being thrown into a conversation after each one ends the batch.
          <div className="flex items-center gap-2">
            <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: "var(--good)" }}>
              <IconCheck size={14} className="flex-none" /> Sent to {m.name.split(" ")[0]}
            </p>
            <button onClick={onOpenChat} className="btn btn-ghost btn-sm flex-none">
              Open chat
            </button>
          </div>
        ) : editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl bg-[var(--sunk)] p-2.5 text-[12.5px] leading-4 outline-none"
            />
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm flex-1">
                Cancel
              </button>
              <button onClick={() => onSend(draft)} className="btn btn-primary btn-sm flex flex-1 items-center justify-center gap-1.5">
                <IconSend size={14} /> Send
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              <IconClock size={12} /> Suggested opener
            </p>
            <p className="mt-1 text-[12.5px] leading-4 text-[var(--ink-soft)]">&ldquo;{draft}&rdquo;</p>
            <div className="mt-2.5 flex gap-1.5">
              <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm flex-1">
                Edit
              </button>
              <button onClick={() => onSend(draft)} className="btn btn-primary btn-sm flex flex-1 items-center justify-center gap-1.5">
                <IconSend size={14} /> Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
