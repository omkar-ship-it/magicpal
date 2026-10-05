"use client";

import { useState } from "react";
import {
  ALL_GROUPS_AND_CLUBS,
  MOCK_NETWORKS,
  NETWORK_KIND_EMOJI,
  NETWORK_KIND_LABEL,
  getMyGroupIds,
  getMyNetworkIds,
  isClub,
  networkById,
  setMyGroupIds,
  setMyNetworkIds,
  type NetworkKind,
} from "@/lib/networks";

const KIND_ORDER: NetworkKind[] = ["institution", "employer", "professional"];

/**
 * Your networks, and the groups and clubs inside them. Prototype only —
 * membership lives in this browser's localStorage, not your account, since
 * there's no memberships table behind any of this yet.
 *
 * Separate from `visibleOnMap` (the real, saved toggle in ProfileForm) —
 * that decides whether you're discoverable at all; this decides which
 * networks you're part of and can filter the map by.
 */
export default function AffiliationsEditor() {
  const [networkIds, setNetworkIds] = useState<string[]>(() => getMyNetworkIds());
  const [groupIds, setGroupIds] = useState<string[]>(() => getMyGroupIds());

  function toggleNetwork(id: string) {
    const next = networkIds.includes(id) ? networkIds.filter((x) => x !== id) : [...networkIds, id];
    setNetworkIds(next);
    setMyNetworkIds(next);
  }

  function toggleGroup(id: string) {
    const next = groupIds.includes(id) ? groupIds.filter((x) => x !== id) : [...groupIds, id];
    setGroupIds(next);
    setMyGroupIds(next);
  }

  return (
    <div className="card mt-6 flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">Your networks</h2>
        <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
          You&apos;re in {networkIds.length} of {MOCK_NETWORKS.length}. Each is a separate network you can select on the map one at a
          time. Prototype — stored in this browser, not saved to your account.
        </p>
      </div>

      {KIND_ORDER.map((kind) => {
        const nets = MOCK_NETWORKS.filter((n) => n.kind === kind);
        if (nets.length === 0) return null;
        return (
          <div key={kind}>
            <p className="label">{NETWORK_KIND_LABEL[kind]}</p>
            <div className="flex flex-wrap gap-1.5">
              {nets.map((n) => (
                <label key={n.id} className="chip-toggle" data-on={networkIds.includes(n.id)}>
                  <input type="checkbox" className="hidden" checked={networkIds.includes(n.id)} onChange={() => toggleNetwork(n.id)} />
                  {NETWORK_KIND_EMOJI[n.kind]} {n.name}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <div className="border-t border-[var(--line)] pt-4">
        <p className="label">Groups &amp; clubs</p>
        <p className="mb-2 text-[12px] text-[var(--ink-soft)]">
          A group belongs to one of your networks. A club is independent — it belongs to no network at all.
        </p>
        <div className="flex flex-col gap-1.5">
          {ALL_GROUPS_AND_CLUBS.map((g) => {
            const parent = g.networkId ? networkById(g.networkId) : undefined;
            const reachable = isClub(g) || (g.networkId != null && networkIds.includes(g.networkId));
            return (
              <label
                key={g.id}
                className="chip-toggle w-fit"
                data-on={groupIds.includes(g.id)}
                style={reachable ? undefined : { opacity: 0.45 }}
                title={reachable ? undefined : `Join ${parent?.name ?? "its network"} first`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={groupIds.includes(g.id)}
                  disabled={!reachable}
                  onChange={() => toggleGroup(g.id)}
                />
                {isClub(g) ? "⛺" : "👥"} {g.name}
                <span className="text-[11px] font-normal text-[var(--ink-soft)]">
                  {isClub(g) ? "independent club" : `in ${parent?.name ?? "—"}`}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
