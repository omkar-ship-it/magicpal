"use client";

import { useState } from "react";
import { entityById } from "@/lib/networks";
import { memberById, type CircleMember } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import {
  GOAL_TEMPLATES,
  OUTCOMES,
  SESSION_ARC,
  cityOf,
  incomingRequestFor,
  mentorMatchesFor,
  mentorshipStats,
  institutionName,
  sessionDates,
  type MentorMatch,
} from "@/lib/mentorship";
import Avatar from "./Avatar";
import { IconAsk, IconCheck, IconClock, IconHeart, IconPeople, IconSparkle } from "./Icons";

type Enrolment = NonNullable<CircleMe["mentorship"]>;

/**
 * Mentorship for an alumni network.
 *
 * Three jobs, in the order they matter: match on the batch gradient that
 * only an institution has, make the commitment finite enough that a busy
 * alum says yes, and record what actually came of it.
 *
 * The last one is the quiet one. A programme that can't say what happened
 * can't be renewed, and most can't, because they only ever count the people
 * who did the thing — never the ones who were talked out of a bad idea.
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
  onUpdate: (m: Enrolment | null) => void;
  onOpenMember: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  const entity = entityById(entityId);
  // Your year drives everything: who is ahead of you, and by how much.
  const myGradYear = Number(entity?.name.match(/(\d{4})/)?.[1] ?? entityId.match(/(\d{4})/)?.[1] ?? 2019);
  const stats = mentorshipStats(entityId, myGradYear);
  const enrol = me.mentorship?.entityId === entityId ? me.mentorship : null;

  if (!enrol) return <Intro entity={entity?.name ?? "this network"} stats={stats} onPick={(role) => onUpdate({ role, entityId })} />;
  if (enrol.role === "mentor") return <MentorSide enrol={enrol} entityId={entityId} myGradYear={myGradYear} onUpdate={onUpdate} onOpenMember={onOpenMember} onMessage={onMessage} />;
  return <MenteeSide me={me} enrol={enrol} entityId={entityId} myGradYear={myGradYear} onUpdate={onUpdate} onOpenMember={onOpenMember} onMessage={onMessage} />;
}

/* ───────────────────────────────────────────────────────── not yet in */

function Intro({
  entity,
  stats,
  onPick,
}: {
  entity: string;
  stats: ReturnType<typeof mentorshipStats>;
  onPick: (role: "mentee" | "mentor") => void;
}) {
  return (
    <div>
      <Header title="Mentoring" sub={`Alumni of ${entity}, in both directions.`} />

      {/* The shape, before the ask. The commitment being finite and legible
          is the reason a busy alum reads any further. */}
      <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 6%, var(--card))" }}>
        <p className="text-[14px] font-bold leading-tight">Four conversations over three months.</p>
        <p className="mt-1 text-[12.5px] leading-5 text-[var(--ink-soft)]">
          That&rsquo;s the whole commitment. It has an end date, each conversation has a job, and mentors take two people at a time —
          which is why they say yes.
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          {SESSION_ARC.map((s) => (
            <div key={s.n} className="flex items-start gap-2">
              <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] font-bold" style={{ background: "var(--card)", color: "var(--brand)" }}>
                {s.n}
              </span>
              <span className="min-w-0 text-[12px] leading-4">
                <span className="font-semibold">{s.label}</span> — {s.purpose}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-1.5">
        <button onClick={() => onPick("mentee")} className="btn btn-primary btn-sm flex-1">
          Find a mentor
        </button>
        <button onClick={() => onPick("mentor")} className="btn btn-ghost btn-sm flex-1">
          Offer to mentor
        </button>
      </div>

      <Stats stats={stats} />
    </div>
  );
}

/* ───────────────────────────────────────────────────────── mentee */

function MenteeSide({
  me,
  enrol,
  entityId,
  myGradYear,
  onUpdate,
  onOpenMember,
  onMessage,
}: {
  me: CircleMe;
  enrol: Enrolment;
  entityId: string;
  myGradYear: number;
  onUpdate: (m: Enrolment | null) => void;
  onOpenMember: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  const [goalDraft, setGoalDraft] = useState("");

  // Step one: a goal. Matching without one produces "grow my network".
  if (!enrol.goal) {
    return (
      <div>
        <Header title="What do you want out of it?" sub="One goal, specific enough to tell whether it happened. This is what you're matched on." />
        <div className="mt-4 flex flex-col gap-1.5">
          {GOAL_TEMPLATES.map((g) => (
            <button key={g} onClick={() => onUpdate({ ...enrol, goal: g })} className="tap card p-3 text-left hover:border-[var(--brand)]">
              <span className="text-[13px] font-medium">{g}</span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <p className="label">Or write your own</p>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              placeholder="Work out whether to…"
              className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
            />
            <button onClick={() => goalDraft.trim() && onUpdate({ ...enrol, goal: goalDraft.trim() })} disabled={!goalDraft.trim()} className="btn btn-primary btn-sm flex-none">
              Use this
            </button>
          </div>
        </div>
        <button onClick={() => onUpdate(null)} className="btn btn-ghost btn-sm mt-4">
          Back
        </button>
      </div>
    );
  }

  // Step three: matched and running.
  if (enrol.mentorId) {
    const mentor = memberById(enrol.mentorId);
    if (mentor) return <Pairing enrol={enrol} mentor={mentor} onUpdate={onUpdate} onOpenMember={onOpenMember} onMessage={onMessage} />;
  }

  // Step two: who to ask.
  const matches = mentorMatchesFor(entityId, myGradYear, enrol.goal, me.interests ?? []);
  const requested = enrol.requestedIds ?? [];

  return (
    <div>
      <Header title="Who to ask" sub={`${matches.length} alumni of ${institutionName(entityId)} who've been where you're going — not classmates.`} />

      <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Your goal</p>
        <p className="mt-0.5 text-[13.5px] font-medium">{enrol.goal}</p>
        <button onClick={() => onUpdate({ ...enrol, goal: undefined })} className="mt-1 text-[11.5px] font-semibold" style={{ color: "var(--brand)" }}>
          Change
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {matches.map((mm) => (
          <MentorCard
            key={mm.member.id}
            mm={mm}
            requested={requested.includes(mm.member.id)}
            onOpen={() => onOpenMember(mm.member.id)}
            onRequest={() =>
              onUpdate({
                ...enrol,
                requestedIds: [...requested, mm.member.id],
                // First ask is seeded as accepted, so the arc below is
                // reachable in a demo without waiting for a reply.
                ...(requested.length === 0 ? { mentorId: mm.member.id, startedDaysAgo: 24, done: [1, 2] } : {}),
              })
            }
          />
        ))}
      </div>

      <button onClick={() => onUpdate(null)} className="btn btn-ghost btn-sm mt-4">
        Leave the programme
      </button>
    </div>
  );
}

function MentorCard({ mm, requested, onOpen, onRequest }: { mm: MentorMatch; requested: boolean; onOpen: () => void; onRequest: () => void }) {
  return (
    <div className="card p-3.5">
      <button onClick={onOpen} className="flex w-full items-center gap-2.5 text-left">
        <Avatar name={mm.member.name} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold leading-tight">{mm.member.name}</span>
          <span className="block truncate text-[12px] text-[var(--ink-soft)]">
            {mm.member.headline} · {mm.member.company}
          </span>
          <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
            Class of {mm.member.gradYear} · {cityOf(mm.member)}
          </span>
        </span>
        <span
          className="flex-none rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
          style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}
        >
          {mm.yearsAhead}y ahead
        </span>
      </button>

      <p className="mt-2 text-[13px] leading-5">{mm.why}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {mm.helpWith.slice(0, 3).map((h) => (
          <span key={h} className="pill" style={{ background: "var(--sunk)", color: "var(--ink)" }}>
            {h}
          </span>
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink-soft)]">
          {mm.sessionsGiven} sessions given · {mm.full ? "two mentees already" : `${2 - mm.menteesNow} slot${2 - mm.menteesNow === 1 ? "" : "s"} open`}
        </span>
        {requested ? (
          <span className="flex flex-none items-center gap-1 text-[12px] font-semibold" style={{ color: "var(--good)" }}>
            <IconCheck size={13} /> Asked
          </span>
        ) : (
          <button onClick={onRequest} disabled={mm.full} className="btn btn-primary btn-sm flex-none">
            {mm.full ? "Full" : "Ask them"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────── the pairing */

function Pairing({
  enrol,
  mentor,
  onUpdate,
  onOpenMember,
  onMessage,
}: {
  enrol: Enrolment;
  mentor: CircleMember;
  onUpdate: (m: Enrolment | null) => void;
  onOpenMember: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  const dates = sessionDates(enrol.startedDaysAgo ?? 0);
  const done = enrol.done ?? [];
  const next = SESSION_ARC.find((s) => !done.includes(s.n));
  const finished = !next;

  return (
    <div>
      <Header title="Your mentor" sub={`Session ${Math.min(done.length + 1, 4)} of 4`} />

      <button onClick={() => onOpenMember(mentor.id)} className="mt-3 flex w-full items-center gap-3 text-left">
        <Avatar name={mentor.name} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-tight">{mentor.name}</span>
          <span className="block truncate text-[12.5px] text-[var(--ink-soft)]">
            {mentor.headline} · {mentor.company}
          </span>
          <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">Class of {mentor.gradYear}</span>
        </span>
      </button>

      <button onClick={() => onMessage(mentor.id)} className="btn btn-ghost btn-sm mt-2.5 w-full">
        Message {mentor.name.split(" ")[0]}
      </button>

      <div className="mt-4 rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">What you&rsquo;re working on</p>
        <p className="mt-0.5 text-[13.5px] font-medium">{enrol.goal}</p>
      </div>

      {/* The arc, with what each conversation is actually for. */}
      <div className="mt-4">
        <p className="label label-icon">
          <IconClock size={13} /> The four
        </p>
        <div className="mt-2 flex flex-col gap-1.5">
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
                {(isNext || !isDone) && <p className="mt-1.5 pl-7 text-[12px] leading-4 text-[var(--ink-soft)]">{s.purpose}</p>}
                {isNext && (
                  <button onClick={() => onUpdate({ ...enrol, done: [...done, s.n] })} className="btn btn-primary btn-sm mt-2.5 ml-7">
                    Mark this one done
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* The bit that lets the programme be renewed. */}
      {finished && (
        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "var(--brand)" }}>
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
                onClick={() => onUpdate({ ...enrol, outcome: o.id })}
                className="tap rounded-2xl border p-2.5 text-left text-[13px] font-medium"
                style={
                  enrol.outcome === o.id
                    ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 7%, var(--card))" }
                    : { borderColor: "var(--line)" }
                }
                aria-pressed={enrol.outcome === o.id}
              >
                {o.label}
              </button>
            ))}
          </div>
          {enrol.outcome && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: "var(--good)" }}>
              <IconCheck size={14} /> Logged. {mentor.name.split(" ")[0]} sees this too.
            </p>
          )}
        </div>
      )}

      <button onClick={() => onUpdate(null)} className="btn btn-ghost btn-sm mt-4">
        Leave the programme
      </button>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── mentor */

function MentorSide({
  enrol,
  entityId,
  myGradYear,
  onUpdate,
  onOpenMember,
  onMessage,
}: {
  enrol: Enrolment;
  entityId: string;
  myGradYear: number;
  onUpdate: (m: Enrolment | null) => void;
  onOpenMember: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  const req = incomingRequestFor(entityId, myGradYear);
  const accepted = enrol.acceptedIds ?? [];
  const declined = enrol.declinedIds ?? [];
  const pending = req && !accepted.includes(req.member.id) && !declined.includes(req.member.id);

  return (
    <div>
      <Header title="Mentoring" sub="Two at a time. Four conversations each. Then it ends unless you both want another round." />

      {pending && req && (
        <div className="mt-4 card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
            Someone is asking
          </p>
          <button onClick={() => onOpenMember(req.member.id)} className="mt-2 flex w-full items-center gap-2.5 text-left">
            <Avatar name={req.member.name} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold leading-tight">{req.member.name}</span>
              <span className="block truncate text-[12px] text-[var(--ink-soft)]">
                {req.member.headline} · {req.member.company}
              </span>
              <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                Class of {req.member.gradYear} · {cityOf(req.member)}
              </span>
            </span>
          </button>

          <div className="mt-2.5 rounded-xl p-2.5" style={{ background: "var(--sunk)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Their goal</p>
            <p className="mt-0.5 text-[13px] font-medium">{req.goal}</p>
          </div>

          <p className="mt-2 text-[12.5px] leading-4">&ldquo;{req.note}&rdquo;</p>

          <div className="mt-3 flex gap-1.5">
            <button onClick={() => onUpdate({ ...enrol, declinedIds: [...declined, req.member.id] })} className="btn btn-ghost btn-sm flex-1">
              Not right now
            </button>
            <button onClick={() => onUpdate({ ...enrol, acceptedIds: [...accepted, req.member.id] })} className="btn btn-primary btn-sm flex-1">
              Take it on
            </button>
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div className="mt-4">
          <p className="label label-icon">
            <IconPeople size={13} /> Your mentees
          </p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {accepted.map((id) => {
              const m = memberById(id);
              if (!m) return null;
              return (
                <div key={id} className="card p-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold leading-tight">{m.name}</span>
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
        </div>
      )}

      {!pending && accepted.length === 0 && (
        <p className="mt-4 rounded-2xl p-4 text-center text-[12.5px] leading-4 text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
          You&rsquo;re listed. Nobody&rsquo;s asked yet — requests tend to come in a rush after the class newsletter goes out.
        </p>
      )}

      <div className="mt-4 rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
        <p className="flex items-start gap-2 text-[12px] leading-4">
          <IconHeart size={14} className="mt-0.5 flex-none" style={{ color: "var(--brand)" }} />
          <span>
            You can be asked by two people at once and no more. The cap isn&rsquo;t politeness — it&rsquo;s the reason the yes is worth
            anything.
          </span>
        </p>
      </div>

      <button onClick={() => onUpdate(null)} className="btn btn-ghost btn-sm mt-4">
        Stop mentoring
      </button>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── shared */

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}>
        <IconAsk size={18} />
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
    <div className="mt-5">
      <p className="label">Across the class</p>
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
            <span className="h-1.5 flex-none rounded-full" style={{ width: Math.max(6, (o.n / Math.max(1, stats.pairs)) * 90), background: o.good ? "var(--good)" : "var(--line)" }} />
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-[var(--ink-soft)]">{o.label}</span>
            <span className="flex-none text-[11.5px] font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
              {o.n}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-[var(--ink-soft)]">
        {logged} of {stats.pairs} pairs have logged an ending. That number is the one an alumni office should be judged on — not how many
        people signed up.
      </p>
    </div>
  );
}
