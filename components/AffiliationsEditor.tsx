"use client";

import { useState } from "react";
import {
  TOP_CLUBS,
  TOP_NETWORKS,
  ancestorsOf,
  childrenOf,
  expandMembership,
  getMyEntityIds,
  setMyEntityIds,
  type MockEntity,
} from "@/lib/networks";

/**
 * Your networks and everything you're in beneath them. Prototype only —
 * membership lives in this browser's localStorage, not your account, since
 * there's no memberships table behind any of this yet.
 *
 * Separate from `visibleOnMap` (the real, saved toggle in ProfileForm) —
 * that decides whether you're discoverable at all; this decides which
 * networks you're part of and can filter the map by.
 */
export default function AffiliationsEditor() {
  const [ids, setIds] = useState<string[]>(() => getMyEntityIds());
  const [open, setOpen] = useState<Set<string>>(new Set());

  const membership = expandMembership(ids);

  function toggle(id: string) {
    const next = ids.includes(id)
      ? ids.filter((x) => x !== id && !ancestorsOf(x).some((a) => a.id === id))
      : Array.from(new Set([...ids, id]));
    setIds(next);
    setMyEntityIds(next);
  }

  function toggleOpen(id: string) {
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function Row({ e, level }: { e: MockEntity; level: number }) {
    const kids = childrenOf(e.id);
    const isOpen = open.has(e.id);
    const joined = membership.has(e.id);
    const direct = ids.includes(e.id);
    return (
      <div>
        <div className="flex items-center gap-1.5 py-0.5" style={{ paddingLeft: level * 16 }}>
          {kids.length > 0 ? (
            <button
              onClick={() => toggleOpen(e.id)}
              className="grid h-5 w-5 flex-none place-items-center rounded text-[11px] text-[var(--ink-soft)] hover:bg-[var(--sunk)]"
              title={isOpen ? "Collapse" : "Expand"}
            >
              {isOpen ? "▾" : "▸"}
            </button>
          ) : (
            <span className="h-5 w-5 flex-none" />
          )}
          <label className="chip-toggle" data-on={joined}>
            <input type="checkbox" className="hidden" checked={joined} onChange={() => toggle(e.id)} />
            {e.emoji} {e.name}
            <span className="text-[11px] font-normal text-[var(--ink-soft)]">
              {e.label}
              {joined && !direct ? " · via a child" : ""}
              {kids.length > 0 ? ` · ${kids.length} ${(e.childLabel ?? "groups").toLowerCase()}` : ""}
            </span>
          </label>
        </div>
        {isOpen && kids.map((k) => <Row key={k.id} e={k} level={level + 1} />)}
      </div>
    );
  }

  return (
    <div className="card mt-6 flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">Your networks</h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
          Expand a network to find its chapters, programmes, classes or groups — each institution names its own levels. Joining
          something joins everything above it. Prototype — stored in this browser, not saved to your account.
        </p>
      </div>

      <div className="flex flex-col">
        {TOP_NETWORKS.map((n) => (
          <Row key={n.id} e={n} level={0} />
        ))}
      </div>

      <div className="border-t border-[var(--line)] pt-4">
        <p className="label">Independent clubs</p>
        <p className="mb-2 text-[12px] text-[var(--ink-soft)]">These belong to no network at all — anyone can join.</p>
        <div className="flex flex-col">
          {TOP_CLUBS.map((c) => (
            <Row key={c.id} e={c} level={0} />
          ))}
        </div>
      </div>
    </div>
  );
}
