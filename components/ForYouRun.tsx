"use client";

import { useEffect, useMemo, useState } from "react";
import { cityById, type CircleEvent } from "@/lib/circleData";
import { OPEN_INTERESTS } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import {
  canUseNear,
  defaultReach,
  reachesFor,
  REACH_LABEL,
  runForYou,
  type Audience,
  type Criteria,
  type Memory,
  type Reach,
} from "@/lib/forYouRun";
import { forgetScope, loadMemory, remember } from "@/lib/runMemory";
import { MatchCard } from "./Matches";

/**
 * "For you" as a run you can aim.
 *
 * The deck is five at a time out of however many qualified, and it refills
 * as you act — because at a 200-person mixer the answer to "who should I
 * talk to" is never a list of two hundred. Depth is shown as a number, not
 * as scroll.
 *
 * Nobody has to configure anything: opening this runs a sensible default
 * from your profile and the board you're on. "Refine" is a control you
 * reach for, never a gate you pass through.
 */
export default function ForYouRun({
  me,
  audience,
  scopeKey,
  onOpenMember,
  onOpenChat,
}: {
  me: CircleMe;
  audience: Audience;
  /** Memory is per board: a dismissal here says nothing about elsewhere. */
  scopeKey: string;
  onOpenMember: (id: string) => void;
  onOpenChat: (id: string) => void;
}) {
  const [criteria, setCriteria] = useState<Criteria>(() => ({
    reach: defaultReach(audience),
    lookingFor: me.interests ?? [],
    canHelpWith: me.helpWith ?? [],
    twoWayOnly: false,
    skipSeen: true,
  }));
  const [refining, setRefining] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const [showFollowUp, setShowFollowUp] = useState(false);
  // Derived rather than held: a counter is cheaper to reason about than a
  // copy of storage that has to be kept in step with it, and the React
  // compiler refuses setState inside an effect anyway. The parent remounts
  // this on scope change, so there is nothing to reset by hand.
  // `version` is the dependency that matters — storage changed, so re-read.
  // The linter can't see through localStorage, hence the explicit disable.
  const [version, setVersion] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memory: Memory = useMemo(() => loadMemory(scopeKey), [scopeKey, version]);

  const result = useMemo(
    () => runForYou({ me, audience, criteria, memory }),
    [me, audience, criteria, memory]
  );

  /**
   * Seeing somebody is what puts them on the follow-up list if you never
   * act on them.
   *
   * Written to storage without re-rendering, deliberately: `shown` has no
   * effect on the deck — only connecting or dismissing removes anybody —
   * so nobody should slide from the deck into "seen but not contacted"
   * while you are still reading them. It lands on the next action or the
   * next time the board is opened, which is when it means something.
   */
  useEffect(() => {
    const unseen = result.deck.map((d) => d.member.id).filter((id) => !memory.shown.includes(id));
    if (unseen.length > 0) remember(scopeKey, { shown: unseen });
  }, [result.deck, memory.shown, scopeKey]);

  const reaches = reachesFor(audience);
  const city = cityById(me.cityId);

  function act(id: string, how: "connected" | "dismissed") {
    remember(scopeKey, { [how]: [id] });
    setVersion((v) => v + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The query, said out loud. If it can't be a sentence it shouldn't
          be a control. */}
      <div>
        {/* No heading: the window is already titled "For you", and saying
            it twice is the panel shouting its own name. */}
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-[12px] leading-[1.45] text-[var(--ink-soft)]">{result.sentence}</p>
          <button
            type="button"
            className="btn btn-ghost btn-sm flex-none"
            aria-expanded={refining}
            onClick={() => setRefining((v) => !v)}
          >
            {refining ? "Done" : "Refine"}
          </button>
        </div>
        <p className="mt-1 text-[12px]" style={{ color: "var(--brand)" }}>
          {result.total === 0
            ? "No matches"
            : `${Math.min(result.deck.length, result.total)} of ${result.total} worth meeting`}
          <span className="text-[var(--ink-soft)]"> · {result.eligible} on this board</span>
        </p>
      </div>

      {refining && (
        <div className="card flex flex-col gap-3 p-3">
          <Control label="How far">
            <div className="flex flex-wrap gap-1.5">
              {reaches.map((r) => {
                // Offered but inert when your own position is a city
                // centroid: "two streets away" is a question your position
                // can't answer, and silently returning nothing would read
                // as the feature being broken.
                const blocked = r === "here" && !canUseNear(me);
                return (
                  <Chip
                    key={r}
                    on={criteria.reach === r}
                    dim={blocked}
                    title={blocked ? "Share your live location to use this" : undefined}
                    onClick={() => {
                      if (!blocked) setCriteria((c) => ({ ...c, reach: r }));
                    }}
                  >
                    {REACH_LABEL[r]}
                  </Chip>
                );
              })}
            </div>
          </Control>

          {/* Seeded from the profile, changed for this run only — editing
              your profile to change your results would change how everyone
              else sees you, permanently, for a need you have this afternoon. */}
          <Control label="I'm looking for help with" hint="For this run only — your profile doesn't change.">
            <TagPicker
              all={OPEN_INTERESTS}
              chosen={criteria.lookingFor}
              onChange={(next) => setCriteria((c) => ({ ...c, lookingFor: next }))}
            />
          </Control>

          <Control label="I can help with">
            <TagPicker
              all={OPEN_INTERESTS}
              chosen={criteria.canHelpWith}
              onChange={(next) => setCriteria((c) => ({ ...c, canHelpWith: next }))}
            />
          </Control>

          <div className="flex flex-wrap gap-1.5">
            <Chip
              on={criteria.twoWayOnly}
              onClick={() => setCriteria((c) => ({ ...c, twoWayOnly: !c.twoWayOnly }))}
            >
              Both ways only
            </Chip>
            <Chip
              on={criteria.skipSeen}
              onClick={() => setCriteria((c) => ({ ...c, skipSeen: !c.skipSeen }))}
            >
              Skip people I&rsquo;ve seen
            </Chip>
          </div>

          {(memory.shown.length > 0 || memory.dismissed.length > 0) && (
            <button
              type="button"
              className="self-start text-[11.5px] font-semibold"
              style={{ color: "var(--ink-soft)" }}
              onClick={() => {
                forgetScope(scopeKey);
                setVersion((v) => v + 1);
              }}
            >
              Start this board over ({memory.shown.length} seen)
            </button>
          )}
        </div>
      )}

      {/* A dead end that names what's blocking turns into the next run. */}
      {result.blocked && (
        <div className="card p-3.5">
          <p className="text-[12.5px] leading-[1.5]">{result.blocked.line}</p>
          {result.blocked.widenTo && (
            <button
              type="button"
              className="btn btn-primary btn-sm mt-2.5"
              onClick={() =>
                setCriteria((c) => ({ ...c, reach: result.blocked!.widenTo as Reach }))
              }
            >
              {REACH_LABEL[result.blocked.widenTo]} instead
            </button>
          )}
        </div>
      )}

      {result.deck.map((match) => (
        <MatchCard
          key={match.member.id}
          match={match}
          sent={sent.includes(match.member.id)}
          onOpen={() => onOpenMember(match.member.id)}
          onDismiss={() => act(match.member.id, "dismissed")}
          onSend={() => {
            setSent((s) => [...s, match.member.id]);
            act(match.member.id, "connected");
          }}
          onOpenChat={() => onOpenChat(match.member.id)}
        />
      ))}

      {result.deck.length > 0 && result.total > result.deck.length && (
        <p className="text-center text-[11.5px] text-[var(--ink-soft)]">
          {result.total - result.deck.length} more behind these — act on one and the next appears.
        </p>
      )}

      {/* Not a list anybody curates. It is simply what the deck left
          behind, which is exactly "who did I miss" after an event. */}
      {result.followUp.length > 0 && (
        <div>
          <button
            type="button"
            className="flex w-full items-center justify-between py-1 text-left"
            onClick={() => setShowFollowUp((v) => !v)}
          >
            <span className="text-[12.5px] font-semibold">
              Seen but not yet contacted · {result.followUp.length}
            </span>
            <span className="text-[11.5px]" style={{ color: "var(--brand)" }}>
              {showFollowUp ? "Hide" : "Show"}
            </span>
          </button>
          {showFollowUp && (
            <div className="mt-2 flex flex-col gap-2">
              {result.followUp.slice(0, 8).map((m) => (
                <button
                  key={m.member.id}
                  type="button"
                  onClick={() => onOpenMember(m.member.id)}
                  className="card flex items-center gap-2.5 p-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold">{m.member.name}</span>
                    <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">{m.why}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {city && audience.kind !== "event" && (
        <p className="text-[11px] text-[var(--ink-soft)]">
          Measured from {city.name}. Change it in You.
        </p>
      )}
    </div>
  );
}

function Control({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label m-0 mb-1">{label}</p>
      {hint && <p className="mb-1.5 text-[11px] text-[var(--ink-soft)]">{hint}</p>}
      {children}
    </div>
  );
}

function Chip({
  on,
  dim,
  title,
  onClick,
  children,
}: {
  on: boolean;
  dim?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-disabled={dim}
      title={title}
      className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
      style={{
        ...(on
          ? { background: "var(--brand)", color: "#fff" }
          : { background: "var(--sunk)", color: "var(--ink-soft)" }),
        ...(dim ? { opacity: 0.45 } : {}),
      }}
    >
      {children}
    </button>
  );
}

/** Six visible, the rest behind "more" — a wall of twenty is a form. */
function TagPicker({
  all,
  chosen,
  onChange,
}: {
  all: readonly string[];
  chosen: string[];
  onChange: (next: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const head = expanded ? all : all.slice(0, 8);
  return (
    <div className="flex flex-wrap gap-1.5">
      {head.map((t) => (
        <Chip
          key={t}
          on={chosen.includes(t)}
          onClick={() => onChange(chosen.includes(t) ? chosen.filter((x) => x !== t) : [...chosen, t])}
        >
          {t}
        </Chip>
      ))}
      {!expanded && all.length > 8 && (
        <button
          type="button"
          className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={{ background: "var(--sunk)", color: "var(--brand)" }}
          onClick={() => setExpanded(true)}
        >
          +{all.length - 8} more
        </button>
      )}
    </div>
  );
}

/** Exported so the event panel can run the same thing against its roster. */
export type { Audience, CircleEvent };
