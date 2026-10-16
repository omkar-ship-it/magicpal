"use client";

import { useMemo } from "react";
import type { CircleMe } from "@/lib/circleMe";
import { defaultReach, runForYou, type Audience } from "@/lib/forYouRun";
import { loadMemory } from "@/lib/runMemory";
import Avatar from "./Avatar";

/**
 * The top of a run, shown where the decision is made.
 *
 * An event page is where somebody decides whether to go and who to find,
 * so "who here is worth meeting" is the most actionable thing on it —
 * putting that behind a button meant leaving the page that holds the date,
 * the venue and the roster in order to see it.
 *
 * A preview rather than the whole run: the criteria panel, the deck and
 * the follow-up list would triple the length of the page and turn a
 * reference into a workspace. Two faces and a count are enough to decide
 * whether to open the real thing.
 */
export default function ForYouPreview({
  me,
  audience,
  scopeKey,
  onOpen,
}: {
  me: CircleMe;
  audience: Audience;
  scopeKey: string;
  onOpen: () => void;
}) {
  const result = useMemo(
    () =>
      runForYou({
        me,
        audience,
        criteria: {
          reach: defaultReach(audience),
          lookingFor: me.interests ?? [],
          canHelpWith: me.helpWith ?? [],
          twoWayOnly: false,
          skipSeen: true,
        },
        // Read, never written: glancing at a preview is not the same as
        // having been shown somebody, and marking them seen here would
        // quietly empty the deck before it was ever opened.
        memory: loadMemory(scopeKey),
      }),
    [me, audience, scopeKey]
  );

  if (result.total === 0) {
    return (
      <button onClick={onOpen} className="btn btn-ghost btn-sm mt-4 w-full">
        Nobody obvious yet · open For you
      </button>
    );
  }

  const top = result.deck.slice(0, 2);

  return (
    <div className="mt-4">
      <p className="label">Worth meeting here</p>
      <div className="mt-1.5 flex flex-col gap-2">
        {top.map((m) => (
          <button
            key={m.member.id}
            onClick={onOpen}
            className="card flex items-start gap-2.5 p-2.5 text-left"
          >
            <Avatar name={m.member.name} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold">{m.member.name}</span>
              <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                {m.member.headline} · {m.member.company}
              </span>
              <span className="mt-0.5 block text-[11.5px]" style={{ color: "var(--brand)" }}>
                {m.why}
              </span>
            </span>
          </button>
        ))}
      </div>
      <button onClick={onOpen} className="btn btn-primary btn-sm mt-2 w-full">
        {result.total > top.length
          ? `See all ${result.total} worth meeting`
          : "Open For you for this event"}
      </button>
    </div>
  );
}
