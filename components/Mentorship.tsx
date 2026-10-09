"use client";

import { useState } from "react";
import { entityById } from "@/lib/networks";
import { memberById, type CircleMember } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import {
  GOAL_TEMPLATES,
  MENTOR_WANTS,
  OUTCOMES,
  SESSION_ARC,
  draftRequest,
  menteeCandidatesFor,
  institutionName,
  mentorMatchesFor,
  mentorshipStats,
  sessionDates,
  waitedLabel,
  type MentorMatch,
} from "@/lib/mentorship";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import MatchPair from "./MatchPair";
import { IconAsk, IconCheck, IconClock, IconHeart, IconPeople, IconSparkle } from "./Icons";

type Ment = NonNullable<CircleMe["mentorship"]>;
type Mentee = NonNullable<NonNullable<Ment["asMentee"]>>;

/**
 * Mentorship for an alumni network.
 *
 * ── The shape, and why ────────────────────────────────────────────────
 * The system proposes, the person disposes. Pure auto-pairing ambushes
 * mentors into relationships they didn't choose; pure browse-and-ask means
 * nobody asks, because cold outreach to someone senior is the hardest
 * message anyone never sends. So: a shortlist with reasons, a drafted
 * request, and a human on each end of the yes.
 *
 * Two limits do most of the work, and they are the feature rather than
 * restrictions on it. A mentee may have exactly one request open — letting
 * someone spray ten is how the best mentors end up with fifty and answer
 * none, and how a mentee avoids ever actually choosing. A mentor takes two
 * people, which is what makes a yes survivable and therefore gettable.
 *
 * ── Why anyone mentors at all ─────────────────────────────────────────
 * Supply is the binding constraint in every alumni mentoring programme,
 * and status is the only currency that reliably buys it. So giving is made
 * visible: a tier on the profile, a count, and one line written by each
 * mentee when the arc closed. That block is the real engine here, more
 * than the matching is.
 */
export default function Mentorship({
  me,
  entityId,
  onUpdate,
  onOpenMember,
  onMessage,
}: {
  me: CircleMe;
  entityId: string;
  onUpdate: (m: Ment | null) => void;
  onOpenMember: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  const entity = entityById(entityId);
  const myGradYear = Number(entity?.name.match(/(\d{4})/)?.[1] ?? entityId.match(/(\d{4})/)?.[1] ?? 2019);
  const stats = mentorshipStats(entityId, myGradYear);
  const ment = me.mentorship?.entityId === entityId ? me.mentorship : null;
  const verified = me.verification?.[entityId] === "verified";

  const set = (patch: Partial<Ment>) => onUpdate({ entityId, ...(ment ?? {}), ...patch });

  return (
    <div>
      <Header title="Mentoring" sub={`${institutionName(entityId)} alumni, in both directions.`} />

      {/* Verification gates both sides. The claim a closed network makes is
          that the person on the other end really did go where they say, and
          mentoring is where that claim actually gets used. */}
      {!verified && (
        <p className="mt-3 rounded-2xl p-3 text-[12.5px] leading-4" style={{ background: "color-mix(in srgb, var(--warn) 10%, var(--card))" }}>
          Mentoring is for verified alumni on both sides. Get verified from your own page — an admin usually turns it round in a day.
        </p>
      )}

      <MenteeBlock
        me={me}
        ment={ment}
        entityId={entityId}
        myGradYear={myGradYear}
        verified={verified}
        set={set}
        onOpenMember={onOpenMember}
        onMessage={onMessage}
      />
      <MentorBlock
        me={me}
        ment={ment}
        entityId={entityId}
        myGradYear={myGradYear}
        verified={verified}
        set={set}
        onMessage={onMessage}
      />

      <Stats stats={stats} />
    </div>
  );
}

/* ────────────────────────────────────────────── asking someone ahead */

function MenteeBlock({
  me,
  ment,
  entityId,
  myGradYear,
  verified,
  set,
  onOpenMember,
  onMessage,
}: {
  me: CircleMe;
  ment: Ment | null;
  entityId: string;
  myGradYear: number;
  verified: boolean;
  set: (p: Partial<Ment>) => void;
  onOpenMember: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  const a = ment?.asMentee ?? null;
  const [goalDraft, setGoalDraft] = useState("");
  const [composing, setComposing] = useState<MentorMatch | null>(null);
  const [note, setNote] = useState("");

  if (a?.mentorId) {
    const mentor = memberById(a.mentorId);
    if (mentor) return <Pairing a={a} mentor={mentor} set={set} onOpenMember={onOpenMember} onMessage={onMessage} />;
  }

  if (a?.pending) {
    const mentor = memberById(a.pending.mentorId);
    const pending = a.pending;
    if (mentor)
      return (
        <Section title="You've asked" icon={<IconClock size={13} />}>
          <div className="card p-3.5">
            <button onClick={() => onOpenMember(mentor.id)} className="flex w-full items-center gap-2.5 text-left">
              <Avatar name={mentor.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[13.5px] font-semibold leading-tight">
                  <span className="min-w-0 truncate">{mentor.name}</span>
                  {mentor.verified && <VerifiedBadge size={12} />}
                </span>
                <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                  Class of {mentor.gradYear} · sent {waitedLabel(pending.sentDaysAgo)}
                </span>
              </span>
            </button>
            <p className="mt-2 whitespace-pre-line rounded-xl p-2.5 text-[12px] leading-4" style={{ background: "var(--sunk)" }}>
              {pending.note}
            </p>
            <p className="mt-2 text-[11.5px] leading-4 text-[var(--ink-soft)]">
              One request at a time. It&rsquo;s the reason mentors here still read them — withdraw if you&rsquo;d rather ask someone else.
            </p>
            <div className="mt-2.5 flex gap-1.5">
              <button onClick={() => set({ asMentee: { ...a, pending: null } })} className="btn btn-ghost btn-sm flex-1">
                Withdraw
              </button>
              {/* Seeded, so the arc below is reachable without waiting on a
                  reply that no real person is going to send to a prototype. */}
              <button
                onClick={() => set({ asMentee: { ...a, pending: null, mentorId: mentor.id, startedDaysAgo: 24, done: [1, 2] } })}
                className="btn btn-primary btn-sm flex-1"
              >
                Simulate accept
              </button>
            </div>
          </div>
        </Section>
      );
  }

  if (!a?.goal) {
    return (
      <Section
        title="I want a mentor"
        icon={<IconAsk size={13} />}
        toggle={{ on: a !== null, onChange: (v) => set({ asMentee: v ? { goal: "" } : null }) }}
      >
        {!verified ? (
          <Locked />
        ) : a === null ? (
          <p className="text-[12.5px] leading-4 text-[var(--ink-soft)]">
            Four conversations with someone who came out of here before you. Turn it on and say what you&rsquo;re trying to work out.
          </p>
        ) : (
          <>
            <Shape />
            <p className="mt-3 text-[12.5px] leading-4 text-[var(--ink-soft)]">
              Start with one goal, specific enough that you could tell whether it happened. It&rsquo;s what you&rsquo;re matched on.
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {GOAL_TEMPLATES.slice(0, 5).map((g) => (
                <button
                  key={g}
                  onClick={() => set({ asMentee: { goal: g } })}
                  className="tap card p-3 text-left text-[13px] font-medium hover:border-[var(--brand)]"
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <input
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="Or write your own…"
                className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
              />
              <button
                onClick={() => goalDraft.trim() && set({ asMentee: { goal: goalDraft.trim() } })}
                disabled={!goalDraft.trim()}
                className="btn btn-primary btn-sm flex-none"
              >
                Use
              </button>
            </div>
          </>
        )}
      </Section>
    );
  }

  const goal = a.goal;
  const matches = mentorMatchesFor(entityId, myGradYear, goal, me.interests ?? [], 8).filter((mm) => mm.member.verified && !mm.full);
  const pick = matches[(a.pickIndex ?? 0) % Math.max(1, matches.length)];

  if (composing && pick) {
    return (
      <Section title={`Ask ${composing.member.name.split(" ")[0]}`} icon={<IconAsk size={13} />}>
        <div className="card p-3.5">
          <div className="flex items-center gap-2.5">
            <Avatar name={composing.member.name} size={40} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[13.5px] font-semibold leading-tight">
                <span className="min-w-0 truncate">{composing.member.name}</span>
                {composing.member.verified && <VerifiedBadge size={12} />}
              </span>
              <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                Class of {composing.member.gradYear} · {composing.yearsAhead}y ahead
              </span>
            </span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={8}
            className="mt-2.5 w-full resize-none rounded-xl bg-[var(--sunk)] p-2.5 text-[12.5px] leading-4 outline-none"
          />
          <p className="mt-1.5 text-[11px] leading-4 text-[var(--ink-soft)]">
            Drafted from your goal and theirs. Edit it — a request nobody wrote isn&rsquo;t worth reading either.
          </p>
          <div className="mt-2.5 flex gap-1.5">
            <button onClick={() => setComposing(null)} className="btn btn-ghost btn-sm flex-1">
              Back
            </button>
            <button
              onClick={() => {
                set({ asMentee: { ...a, goal, pending: { mentorId: composing.member.id, note, sentDaysAgo: 0 } } });
                setComposing(null);
              }}
              className="btn btn-primary btn-sm flex-1"
            >
              Send request
            </button>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Your match" icon={<IconAsk size={13} />} toggle={{ on: true, onChange: () => set({ asMentee: null }) }}>
      <div className="rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">What you&rsquo;re working out</p>
        <p className="mt-0.5 text-[13.5px] font-medium">{goal}</p>
        <button onClick={() => set({ asMentee: { ...a, goal: "" } })} className="mt-1 text-[11.5px] font-semibold" style={{ color: "var(--brand)" }}>
          Change
        </button>
      </div>

      {!pick ? (
        <p className="mt-3 rounded-2xl p-4 text-center text-[12.5px] text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
          Every mentor who fits is at capacity right now. They free up as arcs end.
        </p>
      ) : (
        <div className="mt-3">
          <MatchPair
            me={me}
            other={pick.member}
            side="mentee"
            why={pick.why}
            theyOffer={pick.helpWith.find((h) => (me.interests ?? []).includes(h)) ?? null}
            youOffer={null}
            yearsGap={pick.yearsAhead}
          />

          <div className="mt-3 flex gap-1.5">
            <button
              onClick={() => set({ asMentee: { ...a, pickIndex: ((a.pickIndex ?? 0) + 1) % Math.max(1, matches.length) } })}
              className="btn btn-ghost btn-sm flex-1"
            >
              Someone else
            </button>
            <button
              onClick={() => {
                setNote(draftRequest(pick.member.name, pick.yearsAhead, goal, pick.helpWith.find((h) => (me.interests ?? []).includes(h)) ?? null));
                setComposing(pick);
              }}
              className="btn btn-primary btn-sm flex-1"
            >
              Request {pick.member.name.split(" ")[0]}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-[var(--ink-soft)]">
            {matches.length} fit your goal. One request at a time — it&rsquo;s why mentors here still read them.
          </p>
        </div>
      )}
    </Section>
  );
}

/* ─────────────────────────────────────── answering someone behind */

function MentorBlock({
  me,
  ment,
  entityId,
  myGradYear,
  verified,
  set,
  onMessage,
}: {
  me: CircleMe;
  ment: Ment | null;
  entityId: string;
  myGradYear: number;
  verified: boolean;
  set: (p: Partial<Ment>) => void;
  onMessage: (id: string) => void;
}) {
  const b = ment?.asMentor ?? null;
  const [wants, setWants] = useState(MENTOR_WANTS[0]);
  const [pick, setPick] = useState(0);

  if (!b) {
    return (
      <Section
        title="I can mentor"
        icon={<IconHeart size={13} />}
        toggle={{
          on: false,
          onChange: () => set({ asMentor: { topics: me.helpWith ?? [], capacity: 2, wants, note: "", acceptedIds: [], declinedIds: [] } }),
        }}
      >
        {!verified ? (
          <Locked />
        ) : (
          <>
            <p className="text-[12.5px] leading-4 text-[var(--ink-soft)]">
              Two people at a time, four conversations each, then it ends unless you both want another round. Say who you&rsquo;d rather
              hear from and the requests get better.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MENTOR_WANTS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWants(w)}
                  className="tap rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold"
                  style={
                    wants === w
                      ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
                      : { background: "var(--sunk)", color: "var(--ink-soft)" }
                  }
                  aria-pressed={wants === w}
                >
                  {w}
                </button>
              ))}
            </div>
            <button
              onClick={() => set({ asMentor: { topics: me.helpWith ?? [], capacity: 2, wants, note: "", acceptedIds: [], declinedIds: [] } })}
              className="btn btn-primary btn-sm mt-3 w-full"
            >
              List me as a mentor
            </button>
          </>
        )}
      </Section>
    );
  }

  const candidates = menteeCandidatesFor(entityId, myGradYear, b.topics);
  const accepted = b.acceptedIds ?? [];
  const declined = b.declinedIds ?? [];
  const queue = candidates.filter((c) => !accepted.includes(c.member.id) && !declined.includes(c.member.id));
  const req = queue[pick % Math.max(1, queue.length)];
  const atCap = accepted.length >= b.capacity;

  return (
    <Section title="You're mentoring" icon={<IconHeart size={13} />} toggle={{ on: true, onChange: () => set({ asMentor: null }) }}>
      <p className="text-[11.5px] leading-4 text-[var(--ink-soft)]">
        Listed for <span className="font-semibold">{b.wants.toLowerCase()}</span> · {accepted.length} of {b.capacity} taken
      </p>

      {req && !atCap && (
        <div className="mt-2.5">
          <MatchPair
            me={me}
            other={req.member}
            side="mentor"
            why={`${req.member.name.split(" ")[0]} came out ${req.member.gradYear - myGradYear} years after you and is trying to work out: ${req.goal.toLowerCase()}. ${
              req.wants ? `That turns on ${req.wants}, which you've said you'll talk about.` : "You've been through the version of it they're looking at."
            }`}
            theyOffer={null}
            youOffer={req.wants}
            yearsGap={req.member.gradYear - myGradYear}
          />

          <p className="mt-2.5 rounded-xl p-2.5 text-[12.5px] leading-4" style={{ background: "var(--sunk)" }}>
            &ldquo;{req.note}&rdquo;
          </p>

          <div className="mt-2.5 flex gap-1.5">
            {/* Choosing who you spend four hours on is most of why anyone
                agrees to spend them, so a mentor isn't handed one
                take-it-or-leave-it request. */}
            <button onClick={() => setPick((p) => p + 1)} disabled={queue.length < 2} className="btn btn-ghost btn-sm flex-1">
              Someone else
            </button>
            <button
              onClick={() => set({ asMentor: { ...b, acceptedIds: [...accepted, req.member.id] } })}
              className="btn btn-primary btn-sm flex-1"
            >
              Take {req.member.name.split(" ")[0]} on
            </button>
          </div>
          <button
            onClick={() => set({ asMentor: { ...b, declinedIds: [...declined, req.member.id] } })}
            className="mt-1.5 w-full text-[11.5px] font-semibold"
            style={{ color: "var(--ink-soft)" }}
          >
            Not this round — they&rsquo;re told plainly
          </button>
          <p className="mt-1.5 text-center text-[11px] text-[var(--ink-soft)]">{queue.length} asking · you take two at a time</p>
        </div>
      )}

      {atCap && (
        <p className="mt-2.5 rounded-2xl p-3 text-center text-[12.5px] leading-4 text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
          You&rsquo;re full. New requests wait until one of your arcs ends — which is the reason a yes from you is worth something.
        </p>
      )}

      {accepted.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {accepted.map((id) => {
            const mm = memberById(id);
            if (!mm) return null;
            return (
              <div key={id} className="card p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={mm.name} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[13px] font-semibold leading-tight">
                      <span className="min-w-0 truncate">{mm.name}</span>
                      {mm.verified && <VerifiedBadge size={11} />}
                    </span>
                    <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">Session 1 of 4 · {SESSION_ARC[0].label}</span>
                  </span>
                  <button onClick={() => onMessage(id)} className="btn btn-ghost btn-sm flex-none">
                    Message
                  </button>
                </div>
                <p className="mt-2 text-[12px] leading-4 text-[var(--ink-soft)]">{SESSION_ARC[0].purpose}</p>
              </div>
            );
          })}
        </div>
      )}

      {queue.length === 0 && accepted.length === 0 && (
        <p className="mt-2.5 rounded-2xl p-3 text-center text-[12.5px] leading-4 text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
          You&rsquo;re listed. Requests tend to arrive in a rush after the class newsletter goes out.
        </p>
      )}
    </Section>
  );
}

/* ───────────────────────────────────────────────────── the pairing */

function Pairing({
  a,
  mentor,
  set,
  onOpenMember,
  onMessage,
}: {
  a: Mentee;
  mentor: CircleMember;
  set: (p: Partial<Ment>) => void;
  onOpenMember: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  const dates = sessionDates(a.startedDaysAgo ?? 0);
  const done = a.done ?? [];
  const next = SESSION_ARC.find((s) => !done.includes(s.n));

  return (
    <Section title="Your mentor" icon={<IconClock size={13} />}>
      <button onClick={() => onOpenMember(mentor.id)} className="flex w-full items-center gap-3 text-left">
        <Avatar name={mentor.name} size={48} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[15px] font-semibold leading-tight">
            <span className="min-w-0 truncate">{mentor.name}</span>
            {mentor.verified && <VerifiedBadge size={13} />}
          </span>
          <span className="block truncate text-[12.5px] text-[var(--ink-soft)]">
            {mentor.headline} · {mentor.company}
          </span>
          <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">Class of {mentor.gradYear}</span>
        </span>
      </button>

      <button onClick={() => onMessage(mentor.id)} className="btn btn-ghost btn-sm mt-2 w-full">
        Message {mentor.name.split(" ")[0]}
      </button>

      <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">What you&rsquo;re working on</p>
        <p className="mt-0.5 text-[13.5px] font-medium">{a.goal}</p>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {SESSION_ARC.map((s, i) => {
          const isDone = done.includes(s.n);
          const isNext = next?.n === s.n;
          return (
            <div
              key={s.n}
              className="rounded-2xl border p-3"
              style={
                isNext
                  ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 6%, var(--card))" }
                  : { borderColor: "var(--line)", opacity: isDone ? 0.72 : 1 }
              }
            >
              <div className="flex items-center gap-2">
                <span
                  className="grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] font-bold"
                  style={isDone ? { background: "var(--good)", color: "#fff" } : { background: "var(--sunk)", color: "var(--ink-soft)" }}
                >
                  {isDone ? <IconCheck size={11} /> : s.n}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{s.label}</span>
                <span className="flex-none text-[11px] text-[var(--ink-soft)]">{dates[i]}</span>
              </div>
              {!isDone && <p className="mt-1.5 pl-7 text-[12px] leading-4 text-[var(--ink-soft)]">{s.purpose}</p>}
              {isNext && (
                <button onClick={() => set({ asMentee: { ...a, done: [...done, s.n] } })} className="btn btn-primary btn-sm ml-7 mt-2.5">
                  Mark this one done
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!next && (
        <div className="mt-3 rounded-2xl border p-4" style={{ borderColor: "var(--brand)" }}>
          <p className="label label-icon">
            <IconSparkle size={13} /> How did it end?
          </p>
          <p className="mt-0.5 text-[12px] leading-4 text-[var(--ink-soft)]">
            Including the ones that aren&rsquo;t wins. Being talked out of something is one of the better things a mentor does, and a
            programme that can&rsquo;t record it only ever counts half of what it did.
          </p>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {OUTCOMES.map((o) => (
              <button
                key={o.id}
                onClick={() => set({ asMentee: { ...a, outcome: o.id } })}
                className="tap rounded-2xl border p-2.5 text-left text-[13px] font-medium"
                style={
                  a.outcome === o.id
                    ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 7%, var(--card))" }
                    : { borderColor: "var(--line)" }
                }
                aria-pressed={a.outcome === o.id}
              >
                {o.label}
              </button>
            ))}
          </div>
          {a.outcome && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: "var(--good)" }}>
              <IconCheck size={14} /> Logged — and it counts toward {mentor.name.split(" ")[0]}&rsquo;s mentor record.
            </p>
          )}
        </div>
      )}

      <button onClick={() => set({ asMentee: null })} className="btn btn-ghost btn-sm mt-3">
        End this pairing
      </button>
    </Section>
  );
}

/* ───────────────────────────────────────────────────────── shared */

function Shape() {
  return (
    <div className="rounded-2xl border p-3.5" style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 6%, var(--card))" }}>
      <p className="text-[13.5px] font-bold leading-tight">Four conversations over three months.</p>
      <p className="mt-1 text-[12px] leading-4 text-[var(--ink-soft)]">
        That&rsquo;s the whole commitment. Each one has a job, and mentors take two people at a time — which is why they say yes.
      </p>
      <div className="mt-2 flex flex-col gap-1">
        {SESSION_ARC.map((s) => (
          <div key={s.n} className="flex items-start gap-2">
            <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full text-[9px] font-bold" style={{ background: "var(--card)", color: "var(--brand)" }}>
              {s.n}
            </span>
            <span className="min-w-0 text-[11.5px] font-semibold leading-4">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Locked() {
  return (
    <p className="rounded-2xl p-3 text-[12.5px] leading-4 text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
      Available once you&rsquo;re verified. Both sides have to be — it&rsquo;s the only thing standing between this and a stranger asking
      for an hour.
    </p>
  );
}

/**
 * A block you switch on. Both sides of mentoring are opt-in and
 * independent — most alumni are eventually both — so each gets its own
 * switch rather than a single either/or role.
 */
function Section({
  title,
  icon,
  toggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  toggle?: { on: boolean; onChange: (v: boolean) => void };
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        <p className="label label-icon mb-0 min-w-0 flex-1">
          {icon} {title}
        </p>
        {toggle && (
          <button
            onClick={() => toggle.onChange(!toggle.on)}
            role="switch"
            aria-checked={toggle.on}
            aria-label={title}
            className="relative h-[22px] w-[38px] flex-none rounded-full transition-colors"
            style={{ background: toggle.on ? "var(--brand)" : "var(--line)" }}
          >
            <span
              className="absolute top-[3px] h-4 w-4 rounded-full bg-white transition-transform"
              style={{ left: 3, transform: toggle.on ? "translateX(16px)" : "none" }}
            />
          </button>
        )}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}>
        <IconHeart size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] font-bold leading-tight">{title}</h2>
        <p className="mt-0.5 text-[12px] leading-4 text-[var(--ink-soft)]">{sub}</p>
      </div>
    </div>
  );
}

function Stats({ stats }: { stats: ReturnType<typeof mentorshipStats> }) {
  const { outcomes } = stats;
  const logged = outcomes.did + outcomes.against + outcomes.stalled;
  return (
    <div className="mt-6">
      <p className="label label-icon">
        <IconPeople size={13} /> Across the class
      </p>
      <div className="mt-1.5 grid grid-cols-3 gap-px overflow-hidden rounded-2xl" style={{ background: "var(--line)" }}>
        {[
          { n: stats.pairs, l: "pairs" },
          { n: stats.sessions, l: "sessions" },
          { n: stats.mentorsAvailable, l: "mentors free" },
        ].map((s) => (
          <div key={s.l} className="px-3 py-2.5 text-center" style={{ background: "var(--card)" }}>
            <p className="text-[18px] font-bold leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
              {s.n}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {[
          { label: "Did the thing", n: outcomes.did, good: true },
          { label: "Decided against it, deliberately", n: outcomes.against, good: true },
          { label: "Still going", n: outcomes.going, good: false },
          { label: "Didn't work out", n: outcomes.stalled, good: false },
        ].map((o) => (
          <div key={o.label} className="flex items-center gap-2">
            <span
              className="h-1.5 flex-none rounded-full"
              style={{ width: Math.max(6, (o.n / Math.max(1, stats.pairs)) * 90), background: o.good ? "var(--good)" : "var(--line)" }}
            />
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-[var(--ink-soft)]">{o.label}</span>
            <span className="flex-none text-[11.5px] font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
              {o.n}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-[var(--ink-soft)]">
        {logged} of {stats.pairs} pairs logged an ending. That number is what an alumni office should be judged on — not how many people
        signed up.
      </p>
    </div>
  );
}
