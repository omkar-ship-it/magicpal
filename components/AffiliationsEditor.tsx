"use client";

import { useMemo, useState } from "react";
import { mockGroupsForName } from "@/lib/prototypeData";

/**
 * Prototype only — "which of my affiliations show on my profile" isn't a
 * real, persisted feature yet (there's no groups/memberships table). This is
 * entirely local state so it demonstrates the control without inventing a
 * backend for it; it resets on refresh, which is the point, not a bug.
 *
 * Separate from `visibleOnMap` (the real, saved toggle in ProfileForm) — that
 * controls whether you're discoverable at all; this controls which of your
 * affiliation badges show once you are.
 */
export default function AffiliationsEditor({ name }: { name: string }) {
  const groups = useMemo(() => mockGroupsForName(name), [name]);
  const [mode, setMode] = useState<"all" | "primary">("all");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (groups.length === 0) return null;

  // "Primary" prefers your alumni affiliation if you have one — matching
  // "show just my alumni network" literally — and otherwise falls back to
  // whichever affiliation mockGroupsForName picked first.
  const primary = groups.find((g) => g.type === "alumni") ?? groups[0];
  const visible = groups.filter((g) => (mode === "primary" ? g.id === primary.id : !hidden.has(g.id)));

  function toggleHidden(id: string) {
    setHidden((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="card mt-6 flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">Your affiliations</h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
          Prototype — not saved yet. Controls which affiliation badges show on your profile elsewhere in the app; whether you&apos;re
          visible on the map at all is the toggle below.
        </p>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setMode("primary")}
          className="pill"
          style={
            mode === "primary"
              ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)", border: "1px solid var(--brand)" }
              : { background: "var(--sunk)", color: "var(--ink-soft)", border: "1px solid transparent" }
          }
        >
          Show only my {primary.type === "alumni" ? "alumni network" : "primary affiliation"}
        </button>
        <button
          type="button"
          onClick={() => setMode("all")}
          className="pill"
          style={
            mode === "all"
              ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)", border: "1px solid var(--brand)" }
              : { background: "var(--sunk)", color: "var(--ink-soft)", border: "1px solid transparent" }
          }
        >
          Show all my affiliations
        </button>
      </div>

      {mode === "all" && (
        <div className="flex flex-col gap-1.5">
          {groups.map((g) => (
            <label key={g.id} className="chip-toggle w-fit" data-on={!hidden.has(g.id)}>
              <input type="checkbox" className="hidden" checked={!hidden.has(g.id)} onChange={() => toggleHidden(g.id)} />
              {g.type === "alumni" ? "🎓" : g.type === "community" ? "👥" : "⛺"} {g.name}
            </label>
          ))}
        </div>
      )}

      <div>
        <p className="label">Preview — what others would see</p>
        {visible.length === 0 ? (
          <p className="text-[12.5px] text-[var(--ink-soft)]">No affiliations would show.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {visible.map((g) => (
              <span key={g.id} className="skill-tag">
                {g.type === "alumni" ? "🎓" : g.type === "community" ? "👥" : "⛺"} {g.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
