"use client";

import { useState } from "react";
import { MOCK_GROUPS, mockGroupsForName, getMyExtraGroupIds, setMyExtraGroupIds, type MockGroup } from "@/lib/prototypeData";

const TYPE_EMOJI: Record<MockGroup["type"], string> = { alumni: "🎓", community: "👥", group: "⛺" };

/**
 * Prototype only — "which of my affiliations show on my profile" isn't a
 * real, persisted feature yet (there's no groups/memberships table). Your
 * name-derived affiliations plus anything you add here live in this
 * browser's localStorage, not a backend — it demonstrates the control
 * without inventing a real membership system for it.
 *
 * Separate from `visibleOnMap` (the real, saved toggle in ProfileForm) — that
 * controls whether you're discoverable at all; this controls which of your
 * affiliation badges show once you are, including letting you declare more
 * than the 0–2 your name alone would ever be assigned (e.g. an undergrad
 * degree, an MBA, and a past employer's alumni network, all at once).
 */
export default function AffiliationsEditor({ name }: { name: string }) {
  const baseGroups = mockGroupsForName(name);
  const [extraIds, setExtraIds] = useState<string[]>(() => getMyExtraGroupIds());
  const [mode, setMode] = useState<"all" | "primary">("all");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState("");

  const extraGroups = MOCK_GROUPS.filter((g) => extraIds.includes(g.id) && !baseGroups.some((b) => b.id === g.id));
  const groups = [...baseGroups, ...extraGroups];
  const addable = MOCK_GROUPS.filter((g) => !groups.some((x) => x.id === g.id));

  function addGroup(id: string) {
    if (!id) return;
    const next = [...extraIds, id];
    setExtraIds(next);
    setMyExtraGroupIds(next);
    setPicked("");
  }

  function removeExtra(id: string) {
    const next = extraIds.filter((x) => x !== id);
    setExtraIds(next);
    setMyExtraGroupIds(next);
  }

  function toggleHidden(id: string) {
    setHidden((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // "Primary" prefers your alumni affiliation if you have one — matching
  // "show just my alumni network" literally — and otherwise falls back to
  // whichever affiliation comes first.
  const primary = groups.find((g) => g.type === "alumni") ?? groups[0];
  const visible = groups.filter((g) => (mode === "primary" && primary ? g.id === primary.id : !hidden.has(g.id)));

  return (
    <div className="card mt-6 flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">Your affiliations</h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
          Prototype — stored in this browser only, not saved to your account. Controls which affiliation badges show on your profile
          elsewhere in the app; whether you&apos;re visible on the map at all is the toggle above.
        </p>
      </div>

      {groups.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
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
              Show only my {primary?.type === "alumni" ? "alumni network" : "primary affiliation"}
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
                <div key={g.id} className="flex items-center gap-1.5">
                  <label className="chip-toggle w-fit" data-on={!hidden.has(g.id)}>
                    <input type="checkbox" className="hidden" checked={!hidden.has(g.id)} onChange={() => toggleHidden(g.id)} />
                    {TYPE_EMOJI[g.type]} {g.name}
                  </label>
                  {extraIds.includes(g.id) && (
                    <button
                      type="button"
                      onClick={() => removeExtra(g.id)}
                      className="text-[12px] text-[var(--ink-soft)] hover:text-[var(--warn)]"
                      title="Remove this affiliation"
                    >
                      ×
                    </button>
                  )}
                </div>
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
                    {TYPE_EMOJI[g.type]} {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {addable.length > 0 && (
        <div className="border-t border-[var(--line)] pt-3.5">
          <p className="label">Add a network you&apos;re part of</p>
          <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
            Alumni of more than one school, or in a community your name wasn&apos;t auto-matched to? Add it here.
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <select className="input" value={picked} onChange={(e) => setPicked(e.target.value)}>
              <option value="">Choose a network…</option>
              {addable.map((g) => (
                <option key={g.id} value={g.id}>
                  {TYPE_EMOJI[g.type]} {g.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => addGroup(picked)} disabled={!picked} className="btn btn-primary btn-sm flex-none">
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
