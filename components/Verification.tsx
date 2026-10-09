"use client";

import { useState } from "react";
import { entityById } from "@/lib/networks";
import { membersOf, rnd, type CircleMember } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import { institutionName } from "@/lib/mentorship";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import { IconCheck, IconLock, IconX } from "./Icons";

/**
 * Your own verification, and — if you run the network — everyone else's.
 *
 * The whole claim a closed alumni network makes is that the person on the
 * other end really did go where they say. Everything valuable here leans on
 * that: mentoring requires it on both sides, and a stranger asking a senior
 * alum for four hours of their life is only reasonable because somebody
 * checked. So it's a human decision, made by someone from the institution,
 * rather than a tick-box on signup.
 */
export default function Verification({
  me,
  entityId,
  onUpdate,
  onOpenMember,
}: {
  me: CircleMe;
  entityId: string;
  onUpdate: (patch: Partial<CircleMe>) => void;
  onOpenMember: (id: string) => void;
}) {
  const state = me.verification?.[entityId] ?? "none";
  const isAdmin = (me.adminOf ?? []).includes(entityId);
  const [batch, setBatch] = useState("");
  const [roll, setRoll] = useState("");

  function submit() {
    onUpdate({ verification: { ...(me.verification ?? {}), [entityId]: "pending" } });
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--line)] p-3.5">
      <p className="label label-icon mb-0">
        <IconLock size={13} /> Alumni verification
      </p>

      {state === "verified" ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold">
          <VerifiedBadge size={14} /> Verified alum of {institutionName(entityId)}
        </p>
      ) : state === "pending" ? (
        <>
          <p className="mt-1 text-[12.5px] leading-4 text-[var(--ink-soft)]">
            With the admins. They usually turn it round in a day — you can use everything except mentoring in the meantime.
          </p>
          {/* Prototype shortcut: nobody is going to approve this for real. */}
          <button
            onClick={() => onUpdate({ verification: { ...(me.verification ?? {}), [entityId]: "verified" } })}
            className="btn btn-ghost btn-sm mt-2"
          >
            Simulate approval
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-[12.5px] leading-4 text-[var(--ink-soft)]">
            An admin confirms you against the class list. It&rsquo;s what the badge next to everyone&rsquo;s name means, and it&rsquo;s
            what mentoring is gated on.
          </p>
          <div className="mt-2.5 flex gap-2">
            <input
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="Batch, e.g. PGP 2019"
              className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
            />
            <input
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              placeholder="Roll no."
              className="w-[110px] flex-none rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
            />
          </div>
          <button onClick={submit} disabled={!batch.trim()} className="btn btn-primary btn-sm mt-2 w-full">
            Send to the admins
          </button>
        </>
      )}

      {/* Prototype toggle — a real build grants this from the institution's
          side, not from the member's own settings page. */}
      <button
        onClick={() =>
          onUpdate({
            adminOf: isAdmin ? (me.adminOf ?? []).filter((x) => x !== entityId) : [...(me.adminOf ?? []), entityId],
          })
        }
        className="mt-3 text-[11px] font-semibold"
        style={{ color: "var(--ink-soft)" }}
      >
        {isAdmin ? "Leave admin view" : "Open admin view (prototype)"}
      </button>

      {isAdmin && <AdminQueue entityId={entityId} me={me} onUpdate={onUpdate} onOpenMember={onOpenMember} />}
    </div>
  );
}

/**
 * The queue an alumni office actually works through.
 *
 * Each row carries what the person claimed and what the institution can
 * check it against, because "approve this stranger" is not a decision
 * anyone can make from a name alone.
 */
function AdminQueue({
  entityId,
  me,
  onUpdate,
  onOpenMember,
}: {
  entityId: string;
  me: CircleMe;
  onUpdate: (patch: Partial<CircleMe>) => void;
  onOpenMember: (id: string) => void;
}) {
  const entity = entityById(entityId);
  const handled = me.verifiedByMe ?? {};
  const queue: CircleMember[] = membersOf(entityId)
    .filter((m) => !m.verified && !handled[m.id])
    .slice(0, 5);

  return (
    <div className="mt-3 border-t border-[var(--line)] pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
        Admin · {entity?.name}
      </p>
      <p className="mt-0.5 text-[11.5px] leading-4 text-[var(--ink-soft)]">
        {queue.length} waiting on you. Everything else in here depends on this being done honestly.
      </p>

      <div className="mt-2 flex flex-col gap-1.5">
        {queue.map((m) => (
          <div key={m.id} className="card p-3">
            <button onClick={() => onOpenMember(m.id)} className="flex w-full items-center gap-2.5 text-left">
              <Avatar name={m.name} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold leading-tight">{m.name}</span>
                <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
                  {m.headline} · {m.company}
                </span>
              </span>
            </button>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl p-2.5 text-[11.5px]" style={{ background: "var(--sunk)" }}>
              <span className="text-[var(--ink-soft)]">Claimed</span>
              <span className="font-medium">Class of {m.gradYear}</span>
              <span className="text-[var(--ink-soft)]">Roll no.</span>
              <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                {entityId.slice(0, 3).toUpperCase()}
                {m.gradYear}
                {100 + (rnd(`roll-${m.id}`) % 800)}
              </span>
              <span className="text-[var(--ink-soft)]">On class list</span>
              <span className="font-medium" style={{ color: rnd(`list-${m.id}`) % 100 < 80 ? "var(--good)" : "var(--warn)" }}>
                {rnd(`list-${m.id}`) % 100 < 80 ? "Match found" : "No match — ask them"}
              </span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={() => onUpdate({ verifiedByMe: { ...handled, [m.id]: "rejected" } })}
                className="btn btn-ghost btn-sm flex flex-1 items-center justify-center gap-1.5"
              >
                <IconX size={13} /> Reject
              </button>
              <button
                onClick={() => onUpdate({ verifiedByMe: { ...handled, [m.id]: "approved" } })}
                className="btn btn-primary btn-sm flex flex-1 items-center justify-center gap-1.5"
              >
                <IconCheck size={13} /> Verify
              </button>
            </div>
          </div>
        ))}
        {queue.length === 0 && (
          <p className="rounded-2xl p-3 text-center text-[12.5px] text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
            Queue is clear.
          </p>
        )}
      </div>
    </div>
  );
}
