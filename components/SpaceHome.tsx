"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CircleMember } from "@/lib/circleData";
import type { Match } from "@/lib/matching";
import { MATCH_KIND } from "@/lib/matching";
import {
  ASK_STARTERS,
  DAILY,
  EMPTY,
  HELP_CHIPS,
  IN_TODAY,
  ROSTER,
  SPACE,
  SPOTS,
  TABLE_IDEAS,
  asksThisWeek,
  load,
  managerView,
  memberOf,
  proposeSlot,
  save,
  seededTables,
  topicsFromAsk,
  theySayYes,
  todaysThree,
  type Intro,
  type SpaceMe,
  type SpaceState,
  type Table,
} from "@/lib/twogether";
import Avatar from "./Avatar";

/**
 * The co-working experience, with the crowd removed from the front door.
 *
 * Four tabs, and the order is the argument:
 *
 *  Today    — three people, with reasons, ending in a time and a place.
 *             This is the product. Everything else supports it.
 *  Around   — open tables, for the conversation that can't wait a day.
 *  Asks     — the room's live questions, so *giving* is one tap. In every
 *             network the givers are the scarce side, and most products
 *             make giving the direction you have to go hunting in.
 *  Everyone — the full directory, searchable, nobody hidden. This is the
 *             answer to "I need a backend engineer", which was never the
 *             hard problem and never stopped working.
 *
 * The thing deliberately absent is a browse surface for discovery. Asking
 * someone to scan four hundred strangers is asking them to answer the
 * question they opened the app to ask.
 */

type Tab = "today" | "around" | "asks" | "everyone";

export default function SpaceHome() {
  const [state, setState] = useState<SpaceState>(() => load());
  const [tab, setTab] = useState<Tab>("today");
  const [manager, setManager] = useState(false);

  const put = (next: SpaceState) => {
    setState(next);
    save(next);
  };

  if (!state.me) return <Joining onDone={(me) => put({ ...EMPTY, me })} />;

  const live = state.intros.filter((i) => i.state === "matched" || i.state === "booked");
  const met = state.intros.filter((i) => i.state === "met").length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 pb-16">
      {/* ------------------------------------------------------------ header */}
      <header className="flex flex-wrap items-center gap-2 py-4">
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-[17px]"
          style={{ background: "var(--sunk)" }}
        >
          ☕
        </span>
        <span className="min-w-0">
          <span className="block text-[16px] font-bold leading-tight">{SPACE.name}</span>
          <span className="block text-[11.5px] text-[var(--ink-soft)]">
            {SPACE.place} · {IN_TODAY.length} in today
          </span>
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setManager((v) => !v)}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={manager ? { background: "var(--brand)", color: "#fff" } : { background: "var(--sunk)", color: "var(--ink-soft)" }}
          >
            Manager
          </button>
          {/* The space is the default surface; the public map is one tap away. */}
          <Link
            href="/open"
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
          >
            Public map ↗
          </Link>
        </span>
      </header>

      {manager && <Manager onClose={() => setManager(false)} />}

      {/* ------------------------------------------------------------- tabs */}
      <nav className="sticky top-0 z-10 -mx-4 flex gap-1 px-4 py-2" style={{ background: "var(--bg, var(--sunk))" }}>
        {(
          [
            ["today", "Today"],
            ["around", "Around now"],
            ["asks", "Asks"],
            ["everyone", `Everyone ${ROSTER.length}`],
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={tab === id ? { background: "var(--brand)", color: "#fff" } : { background: "var(--card)", color: "var(--ink-soft)" }}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="flex-1 pt-2">
        {tab === "today" && (
          <Today
            state={state}
            live={live}
            met={met}
            onDecide={(m, yes) => {
              const intro: Intro = yes
                ? theySayYes(m.member.id)
                  ? { memberId: m.member.id, day: state.me!.day, state: "matched" }
                  : { memberId: m.member.id, day: state.me!.day, state: "waiting" }
                : { memberId: m.member.id, day: state.me!.day, state: "passed" };
              put({ ...state, intros: [...state.intros, intro] });
            }}
            onBook={(id) =>
              put({
                ...state,
                intros: state.intros.map((i) =>
                  i.memberId === id ? { ...i, state: "booked", slot: proposeSlot(id) } : i
                ),
              })
            }
            onMet={(id, outcome) =>
              put({
                ...state,
                intros: state.intros.map((i) => (i.memberId === id ? { ...i, state: "met", outcome } : i)),
              })
            }
            onTomorrow={() => put({ ...state, me: { ...state.me!, day: state.me!.day + 1 } })}
          />
        )}

        {tab === "around" && (
          <Around
            state={state}
            onJoin={(id) =>
              put({
                ...state,
                joinedTables: state.joinedTables.includes(id)
                  ? state.joinedTables.filter((t) => t !== id)
                  : [...state.joinedTables, id],
              })
            }
            onStart={(t) => put({ ...state, myTable: t })}
            onEnd={() => put({ ...state, myTable: null })}
          />
        )}

        {tab === "asks" && (
          <Asks
            state={state}
            onHelp={(id) =>
              put({
                ...state,
                intros: [
                  ...state.intros.filter((i) => i.memberId !== id),
                  { memberId: id, day: state.me!.day, state: "matched" },
                ],
              })
            }
            onGoToday={() => setTab("today")}
          />
        )}

        {tab === "everyone" && <Everyone />}
      </main>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════ joining */

/**
 * Three questions, filled in at a front desk while the coffee lands.
 *
 * The pair at the bottom is the entire data model. A profile that asks for
 * a bio, a photo, links and a headline gets abandoned at the second field,
 * and none of those four make a single match possible. "What I need" and
 * "what I'll answer" make every match possible, and make the first message
 * an exchange instead of a favour.
 */
function Joining({ onDone }: { onDone: (me: SpaceMe) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [ask, setAsk] = useState("");
  const [wants, setWants] = useState<string[]>([]);
  const [help, setHelp] = useState<string[]>([]);

  /** Derived live from the ask, so the box is never empty and never stale. */
  const derived = useMemo(() => (ask.trim() ? topicsFromAsk(ask) : []), [ask]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string, cap: number) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : list.length >= cap ? list : [...list, v]);

  const ready = name.trim() !== "" && ask.trim() !== "" && help.length > 0;

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-10">
      <p className="text-[12px] font-semibold" style={{ color: "var(--brand)" }}>
        {SPACE.name} · {SPACE.place}
      </p>
      <h1 className="mt-1 text-[26px] font-bold leading-tight">
        Three questions, then we&apos;ll introduce you to three people tomorrow morning.
      </h1>
      <p className="mt-2 text-[13px] text-[var(--ink-soft)]">
        {ROSTER.length} members. You will never be asked to scroll through them.
      </p>

      <div className="card mt-5 p-4">
        <label className="block text-[11.5px] font-semibold text-[var(--ink-soft)]">Your name</label>
        <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <span>
            <label className="block text-[11.5px] font-semibold text-[var(--ink-soft)]">What you do</label>
            <input className="input mt-1" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Founder" />
          </span>
          <span>
            <label className="block text-[11.5px] font-semibold text-[var(--ink-soft)]">Where</label>
            <input className="input mt-1" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Clearwing" />
          </span>
        </div>

        <label className="mt-4 block text-[12.5px] font-semibold">What are you after right now?</label>
        <p className="text-[11px] text-[var(--ink-soft)]">One line. It expires in two weeks, so it stays true.</p>
        <input
          className="input mt-1.5"
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          placeholder="A senior backend hire, Bengaluru"
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ASK_STARTERS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAsk(a)}
              className="rounded-full px-2 py-0.5 text-[10.5px]"
              style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
            >
              {a}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-[12.5px] font-semibold">And what will you answer questions about?</label>
        <p className="text-[11px] text-[var(--ink-soft)]">
          Pick up to three. This is the half that gets you introduced to people who need you.
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {HELP_CHIPS.slice(0, 14).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => toggle(help, setHelp, h, 3)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={
                help.includes(h)
                  ? { background: "var(--brand)", color: "#fff" }
                  : { background: "var(--sunk)", color: "var(--ink-soft)" }
              }
            >
              {h}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl p-2.5" style={{ background: "var(--sunk)" }}>
          <p className="text-[11.5px] font-semibold">We&apos;ll match you on</p>
          <p className="text-[11px] text-[var(--ink-soft)]">
            Read off your ask. Tap to change — this is what the room gets matched against, so it&apos;s worth
            being right.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Array.from(new Set([...derived, ...wants])).map((h) => {
              const on = wants.length > 0 ? wants.includes(h) : derived.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    const base = wants.length > 0 ? wants : derived;
                    setWants(base.includes(h) ? base.filter((x) => x !== h) : [...base, h]);
                  }}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={on ? { background: "var(--brand)", color: "#fff" } : { background: "var(--card)", color: "var(--ink-soft)" }}
                >
                  {h}
                </button>
              );
            })}
            {HELP_CHIPS.filter((h) => !derived.includes(h) && !wants.includes(h))
              .slice(0, 5)
              .map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setWants([...(wants.length > 0 ? wants : derived), h])}
                  className="rounded-full px-2.5 py-1 text-[11px]"
                  style={{ background: "var(--card)", color: "var(--ink-soft)", opacity: 0.6 }}
                >
                  + {h}
                </button>
              ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!ready}
          onClick={() =>
            onDone({
              name: name.trim(),
              role: role.trim() || "Member",
              company: company.trim(),
              ask: ask.trim(),
              wants: wants.length > 0 ? wants : derived,
              helpWith: help,
              day: 0,
            })
          }
          className="btn btn-primary mt-4 w-full"
        >
          Join {SPACE.name}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ today */

function Today({
  state,
  live,
  met,
  onDecide,
  onBook,
  onMet,
  onTomorrow,
}: {
  state: SpaceState;
  live: Intro[];
  met: number;
  onDecide: (m: Match, yes: boolean) => void;
  onBook: (id: string) => void;
  onMet: (id: string, outcome: string) => void;
  onTomorrow: () => void;
}) {
  const allocated = useMemo(() => todaysThree(state), [state]);
  /** The day's three, minus the ones already spent today. */
  const decidedToday = new Set(
    state.intros.filter((i) => i.day === state.me?.day).map((i) => i.memberId)
  );
  const three = allocated.filter((m) => !decidedToday.has(m.member.id));
  const waiting = state.intros.filter((i) => i.state === "waiting");

  return (
    <div className="flex flex-col gap-3 pb-4">
      {live.length > 0 && (
        <section>
          <h2 className="mb-1.5 text-[12px] font-semibold text-[var(--ink-soft)]">Your introductions</h2>
          <div className="flex flex-col gap-2">
            {live.map((i) => (
              <Booked key={i.memberId} intro={i} onBook={onBook} onMet={onMet} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[15px] font-bold">
          {three.length > 0 ? "Three people worth meeting" : "That's today"}
        </h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
          {three.length > 0
            ? `Picked against what you said you're after. ${three.length} of ${DAILY} left today.`
            : "Three more tomorrow morning. The room is 380 people deep — you will not run out."}
        </p>
      </section>

      {three.map((m) => (
        <IntroCard key={m.member.id} match={m} onDecide={onDecide} />
      ))}

      {three.length === 0 && (
        <div className="card flex flex-col gap-2 p-4">
          <p className="text-[12.5px]">
            So far: <strong>{state.intros.filter((i) => i.state !== "passed").length}</strong> introductions,{" "}
            <strong>{met}</strong> met.
          </p>
          {/* A demo control, labelled as one. An operator watching this needs
              to see the loop repeat, not be told that it does. */}
          <button type="button" onClick={onTomorrow} className="btn btn-primary">
            Prototype: skip to tomorrow morning →
          </button>
        </div>
      )}

      {waiting.length > 0 && (
        <p className="text-[11.5px] text-[var(--ink-soft)]">
          {waiting.length} waiting on the other person. Nobody is told you said yes unless they do too — which
          is why saying yes costs nothing.
        </p>
      )}
    </div>
  );
}

/**
 * One introduction.
 *
 * The exchange is stated in both directions on purpose. "You should meet
 * Ananya" is a chore; "Ananya has done the pricing work you're stuck on,
 * and you've done the US launch she's asking about" is a conversation that
 * has already started. It is also the only honest way to ask a busy person
 * for twenty minutes.
 */
function IntroCard({ match, onDecide }: { match: Match; onDecide: (m: Match, yes: boolean) => void }) {
  const m = match.member;
  return (
    <article className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar name={m.name} size={52} ring={2} local />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight">{m.name}</p>
          <p className="truncate text-[12px] text-[var(--ink-soft)]">
            {m.headline} · {m.company}
          </p>
          <span
            className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
            style={{ background: "var(--sunk)", color: "var(--brand)" }}
          >
            {MATCH_KIND[match.kind].label}
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-[13px] leading-[1.45]">{match.why}</p>

      <div className="mt-2.5 flex flex-col gap-1 rounded-xl p-2.5" style={{ background: "var(--sunk)" }}>
        {match.theyOffer && (
          <p className="text-[11.5px]">
            <span className="font-semibold">They&apos;ll talk about</span> {match.theyOffer}
          </p>
        )}
        {match.youOffer && (
          <p className="text-[11.5px]">
            <span className="font-semibold">You can help with</span> {match.youOffer}
          </p>
        )}
        {!match.theyOffer && !match.youOffer && (
          <p className="text-[11.5px] text-[var(--ink-soft)]">{m.lookingFor ?? m.bio}</p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onDecide(match, false)} className="btn btn-ghost flex-none px-3">
          Not today
        </button>
        <button type="button" onClick={() => onDecide(match, true)} className="btn btn-primary flex-1">
          Yes — introduce us
        </button>
      </div>
    </article>
  );
}

/**
 * What happens after a mutual yes, which is where every networking product
 * quietly dies.
 *
 * The usual ending is "you matched!" and an empty message box, and an empty
 * message box is a decision — what to say, when to say it, whether it's too
 * late to say it now. So the product makes the decision: a specific time,
 * a specific table, twenty minutes. Decline and it proposes another. The
 * only thing left for a person to do is show up.
 */
function Booked({
  intro,
  onBook,
  onMet,
}: {
  intro: Intro;
  onBook: (id: string) => void;
  onMet: (id: string, outcome: string) => void;
}) {
  const m = memberOf(intro.memberId) as CircleMember | undefined;
  const [outcome, setOutcome] = useState("");
  if (!m) return null;

  if (intro.state === "matched") {
    const slot = proposeSlot(m.id);
    return (
      <article className="card p-3.5" style={{ borderColor: "var(--brand)" }}>
        <div className="flex items-center gap-2.5">
          <Avatar name={m.name} size={38} ring={2} local />
          <p className="min-w-0 flex-1 text-[13px]">
            <strong>{m.name.split(" ")[0]} said yes too.</strong>
            <span className="block text-[11.5px] text-[var(--ink-soft)]">
              {m.headline} · {m.company}
            </span>
          </p>
        </div>
        <p className="mt-2.5 rounded-xl p-2.5 text-[13px] font-semibold" style={{ background: "var(--sunk)" }}>
          ☕ {slot.when} · {slot.where} · 20 minutes
        </p>
        <button type="button" onClick={() => onBook(m.id)} className="btn btn-primary mt-2.5 w-full">
          That works — book it
        </button>
      </article>
    );
  }

  return (
    <article className="card p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar name={m.name} size={38} ring={2} local />
        <p className="min-w-0 flex-1 text-[13px]">
          <strong>{m.name.split(" ")[0]}</strong>
          <span className="block text-[11.5px]" style={{ color: "var(--brand)" }}>
            ☕ {intro.slot?.when} · {intro.slot?.where}
          </span>
        </p>
      </div>
      <div className="mt-2.5 flex gap-2">
        <input
          className="input flex-1 py-1.5 text-[12px]"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="Afterwards: what came of it?"
          aria-label="What came of it"
        />
        <button type="button" onClick={() => onMet(m.id, outcome.trim())} className="btn btn-ghost flex-none px-3">
          We met
        </button>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════════════ around now */

function Around({
  state,
  onJoin,
  onStart,
  onEnd,
}: {
  state: SpaceState;
  onJoin: (id: string) => void;
  onStart: (t: Table) => void;
  onEnd: () => void;
}) {
  const tables = useMemo(() => seededTables(), []);
  const [agenda, setAgenda] = useState("");
  const [place, setPlace] = useState(SPOTS[0]);

  return (
    <div className="flex flex-col gap-3 pb-4">
      <section>
        <h2 className="text-[15px] font-bold">Open tables</h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
          Somebody is sitting somewhere and has said what for. No introduction needed — turn up.
        </p>
      </section>

      {state.myTable && (
        <article className="card p-3.5" style={{ borderColor: "var(--brand)" }}>
          <p className="text-[12.5px] font-semibold" style={{ color: "var(--brand)" }}>
            Your table · {state.myTable.place}
          </p>
          <p className="mt-0.5 text-[13px]">{state.myTable.agenda}</p>
          <p className="mt-1 text-[11.5px] text-[var(--ink-soft)]">
            {IN_TODAY.length} people in the building were told. {state.myTable.joinedIds.length} coming.
          </p>
          <button type="button" onClick={onEnd} className="btn btn-ghost mt-2 w-full">
            Close the table
          </button>
        </article>
      )}

      {tables.map((t) => {
        const joined = state.joinedTables.includes(t.id);
        return (
          <article key={t.id} className="card p-3.5">
            <div className="flex items-start gap-2.5">
              <Avatar name={t.hostName} size={38} ring={2} local />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight">{t.agenda}</p>
                <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
                  {t.hostName.split(" ")[0]} · {t.place} · in {t.startsIn} min · {t.minutes} min
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex -space-x-2">
                {t.joinedIds.slice(0, 5).map((id) => {
                  const p = memberOf(id);
                  return p ? <Avatar key={id} name={p.name} size={22} ring={2} local /> : null;
                })}
              </span>
              <span className="text-[11.5px] text-[var(--ink-soft)]">
                {t.joinedIds.length + (joined ? 1 : 0)} coming
              </span>
              <button
                type="button"
                onClick={() => onJoin(t.id)}
                className={`btn ${joined ? "btn-ghost" : "btn-primary"} ml-auto flex-none px-3`}
              >
                {joined ? "I'm out" : "I'm in"}
              </button>
            </div>
          </article>
        );
      })}

      <article className="card p-3.5">
        <p className="text-[12.5px] font-semibold">Start one</p>
        <p className="text-[11px] text-[var(--ink-soft)]">
          &ldquo;I&apos;m at the café&rdquo; isn&apos;t an invitation. An agenda is.
        </p>
        <input
          className="input mt-2 py-1.5 text-[12.5px]"
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="Coffee — anyone building in fintech"
          aria-label="What your table is for"
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {TABLE_IDEAS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAgenda(t)}
              className="rounded-full px-2 py-0.5 text-[10.5px]"
              style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {SPOTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPlace(s)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={place === s ? { background: "var(--brand)", color: "#fff" } : { background: "var(--sunk)", color: "var(--ink-soft)" }}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={agenda.trim() === ""}
          onClick={() =>
            onStart({
              id: `mine-${Date.now()}`,
              hostId: null,
              hostName: "You",
              place,
              agenda: agenda.trim(),
              startsIn: 0,
              minutes: 30,
              joinedIds: IN_TODAY.slice(0, 2).map((m) => m.id),
            })
          }
          className="btn btn-primary mt-2.5 w-full"
        >
          Open the table — tells {IN_TODAY.length} people in today
        </button>
      </article>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ asks */

function Asks({
  state,
  onHelp,
  onGoToday,
}: {
  state: SpaceState;
  onHelp: (id: string) => void;
  onGoToday: () => void;
}) {
  const asks = useMemo(() => asksThisWeek(36), []);
  const grouped = useMemo(() => {
    const g = new Map<string, typeof asks>();
    for (const a of asks) g.set(a.topic, [...(g.get(a.topic) ?? []), a]);
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [asks]);
  const offered = new Set(state.intros.map((i) => i.memberId));

  return (
    <div className="flex flex-col gap-4 pb-4">
      <section>
        <h2 className="text-[15px] font-bold">What the room is asking this week</h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
          The fastest way to be worth knowing here is to answer one of these. Asks expire, so the list is
          always true.
        </p>
      </section>

      {grouped.map(([topic, list]) => (
        <section key={topic}>
          <p className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[12.5px] font-semibold">{topic}</span>
            <span className="mono text-[11px] text-[var(--ink-soft)]">{list.length}</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {list.map((a) => (
              <article key={a.member.id} className="card flex items-start gap-2.5 p-3">
                <Avatar name={a.member.name} size={32} local />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-snug">{a.ask}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
                    {a.member.name} · {a.member.headline} · {a.daysLeft}d left
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onHelp(a.member.id);
                    onGoToday();
                  }}
                  className={`btn ${offered.has(a.member.id) ? "btn-ghost" : "btn-primary"} flex-none px-2.5 text-[11.5px]`}
                >
                  {offered.has(a.member.id) ? "Offered" : "I can help"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ everyone */

/**
 * The directory, kept in full.
 *
 * This is the surface for the reader who already knows what they want, and
 * for that reader it has always worked. Removing it to force everybody
 * through the matcher would be solving discovery by breaking search — and
 * it is also the thing that makes the scarcity above feel generous rather
 * than withholding: the room is right there, any time you want it.
 */
function Everyone() {
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();

  const rows = useMemo(() => {
    return ROSTER.filter((m) => {
      if (skill && !m.helpWith.includes(skill)) return false;
      if (!needle) return true;
      return [m.name, m.headline, m.company, m.lookingFor ?? "", ...m.helpWith]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    }).slice(0, 120);
  }, [needle, skill]);

  return (
    <div className="flex flex-col gap-2 pb-4">
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search all ${ROSTER.length} — name, company, what they're after…`}
        aria-label="Search members"
      />
      <div className="flex flex-wrap gap-1">
        {HELP_CHIPS.slice(0, 10).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setSkill(skill === h ? null : h)}
            className="rounded-full px-2.5 py-1 text-[11px]"
            style={skill === h ? { background: "var(--brand)", color: "#fff" } : { background: "var(--sunk)", color: "var(--ink-soft)" }}
          >
            {h}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[var(--ink-soft)]">
        {rows.length === 120 ? "First 120" : rows.length} of {ROSTER.length}
      </p>
      {rows.map((m) => (
        <article key={m.id} className="card flex items-start gap-2.5 p-3">
          <Avatar name={m.name} size={34} local />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold">{m.name}</p>
            <p className="truncate text-[11.5px] text-[var(--ink-soft)]">
              {m.headline} · {m.company}
            </p>
            {m.lookingFor && (
              <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--brand)" }}>
                Looking for {m.lookingFor}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════ the manager's view */

function Manager({ onClose }: { onClose: () => void }) {
  const v = useMemo(() => managerView(), []);
  return (
    <section className="card mb-2 p-3.5" style={{ borderColor: "var(--brand)" }}>
      <p className="flex items-center justify-between text-[12.5px] font-bold">
        Community manager
        <button type="button" onClick={onClose} className="text-[11px] font-semibold text-[var(--ink-soft)]">
          Close
        </button>
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
        You already make introductions by hand. This is the list you never had.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl p-2.5" style={{ background: "var(--sunk)" }}>
          <p className="text-[18px] font-bold leading-none">{v.unmatched.length}</p>
          <p className="mt-1 text-[11px] text-[var(--ink-soft)]">new this week, not introduced to anyone yet</p>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "var(--sunk)" }}>
          <p className="text-[18px] font-bold leading-none">{v.unanswered.length}</p>
          <p className="mt-1 text-[11px] text-[var(--ink-soft)]">asks nobody has answered — worth a nudge</p>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "var(--sunk)" }}>
          <p className="text-[12.5px] font-semibold leading-tight">{v.trending[0]?.topic ?? "—"}</p>
          <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
            most asked about this week ({v.trending[0]?.n ?? 0}) — the event to run
          </p>
        </div>
      </div>
      <Link href="/2gethr/wall" className="btn btn-ghost mt-2.5 w-full">
        Open the public wall →
      </Link>
    </section>
  );
}
