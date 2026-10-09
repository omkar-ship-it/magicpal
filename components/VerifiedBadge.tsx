"use client";

import { IconCheck } from "./Icons";

/**
 * The institution says this person really is one of theirs.
 *
 * It appears everywhere a person does — list row, hover card, profile,
 * mentor card — because a badge you have to go looking for isn't doing the
 * job. The absence is deliberately quiet rather than a red warning: not yet
 * verified is a queue position, not an accusation.
 */
export default function VerifiedBadge({ size = 14, label }: { size?: number; label?: string }) {
  return (
    <span
      className="inline-grid flex-none place-items-center rounded-full align-middle"
      style={{ width: size, height: size, background: "var(--brand)", color: "#fff" }}
      title={label ?? "Verified alum"}
      aria-label={label ?? "Verified alum"}
    >
      <IconCheck size={Math.round(size * 0.68)} strokeWidth={3} />
    </span>
  );
}

export function UnverifiedChip() {
  return (
    <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
      Awaiting verification
    </span>
  );
}
