"use client";

import { useEffect, useState } from "react";
import {
  MOCK_CLUBS,
  NETWORK_KIND_EMOJI,
  NETWORK_KIND_LABEL,
  PUBLIC_ENTITY_ID,
  groupById,
  groupsOfNetwork,
  isClub,
  membersOfGroup,
  membersOfNetwork,
  networkById,
  type MockPost,
} from "@/lib/networks";
import { MOCK_EVENTS } from "@/lib/prototypeData";
import { type Profile, type ConnState, ProfileListRow, CalendarIcon } from "./MapPrimitives";
import Feed from "./Feed";

/** What's currently open. Panels stack: public → network → group, each pushed on top of the map. */
export type PanelRef = { kind: "public" } | { kind: "network"; id: string } | { kind: "group"; id: string };

/**
 * One panel for any level of the hierarchy — the public network, a network,
 * a group inside a network, or an independent club. Each shows the same
 * four things in the same order: who it is, its feed, what's happening, and
 * who's in it. Opens over the map; closing unwinds the stack back to it.
 */
export default function EntityPanel({
  panel,
  depth,
  people,
  loading,
  posts,
  onPost,
  isMember,
  onToggleMembership,
  onOpen,
  onBack,
  onClose,
  conn,
  onConnect,
  onRespond,
  canAct,
  now,
}: {
  panel: PanelRef;
  /** >1 means there's something underneath to go back to. */
  depth: number;
  /** Always the worldwide roster, so "members everywhere" doesn't depend on the map's current mode. */
  people: Profile[];
  loading?: boolean;
  posts: MockPost[];
  onPost: (entityId: string, body: string) => void;
  isMember: boolean;
  onToggleMembership: () => void;
  onOpen: (next: PanelRef) => void;
  onBack: () => void;
  onClose: () => void;
  conn: Record<string, ConnState>;
  onConnect: (id: string, note?: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  canAct: boolean;
  now: number;
}) {
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [rsvped, setRsvped] = useState<Set<string>>(new Set());

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const network = panel.kind === "network" ? networkById(panel.id) : undefined;
  const group = panel.kind === "group" ? groupById(panel.id) : undefined;
  const parentNetwork = group?.networkId ? networkById(group.networkId) : undefined;

  if (panel.kind === "network" && !network) return null;
  if (panel.kind === "group" && !group) return null;

  const entityId = panel.kind === "public" ? PUBLIC_ENTITY_ID : panel.kind === "network" ? panel.id : panel.id;

  const title = panel.kind === "public" ? "Public Network" : network ? network.name : group!.name;
  const emoji = panel.kind === "public" ? "🌍" : network ? NETWORK_KIND_EMOJI[network.kind] : group && isClub(group) ? "⛺" : "👥";
  const subtitle =
    panel.kind === "public"
      ? "Everyone on the map — no membership needed"
      : network
        ? `${NETWORK_KIND_LABEL[network.kind]}${network.place ? ` · ${network.place.city}` : ""}`
        : group && isClub(group)
          ? "Independent club"
          : `Group in ${parentNetwork?.name ?? "a network"}`;
  const blurb = panel.kind === "public" ? "Every professional visible on MagicPal, anywhere in the world." : network ? network.missionMock : group!.blurbMock;
  const memberCount = panel.kind === "public" ? null : network ? network.memberCountMock : group!.memberCountMock;

  const members =
    panel.kind === "public" ? people : panel.kind === "network" ? membersOfNetwork(people, panel.id) : membersOfGroup(people, panel.id);
  const events = MOCK_EVENTS.filter((e) => (panel.kind === "public" ? false : e.hostEntityId === entityId));
  const childGroups = panel.kind === "network" ? groupsOfNetwork(panel.id) : [];
  const clubs = panel.kind === "public" ? MOCK_CLUBS : [];

  function toggleRsvp(id: string) {
    setRsvped((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-[1290] bg-black/20" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-[1300] w-full overflow-y-auto border-l border-[var(--line)] p-5 sm:w-[430px]"
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="flex items-center justify-between gap-3">
          {depth > 1 ? (
            <button onClick={onBack} className="text-[12.5px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]">
              ← Back
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="grid h-8 w-8 flex-none place-items-center rounded-full text-[var(--ink-soft)] hover:bg-[var(--sunk)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-1">
          <span className="text-[26px] leading-none">{emoji}</span>
          <h2 className="mt-1.5 text-[19px] font-bold leading-tight">{title}</h2>
          <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {memberCount != null && (
              <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                {memberCount.toLocaleString()} members
              </span>
            )}
            {panel.kind !== "public" && (
              <button
                onClick={onToggleMembership}
                className={isMember ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm"}
              >
                {isMember ? "Joined ✓" : "Join"}
              </button>
            )}
          </div>
          <p className="mt-3 text-[13.5px] leading-5 text-[var(--ink)]">{blurb}</p>
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Feed</h3>
          <Feed posts={posts} entityName={title} canPost={panel.kind === "public" || isMember} onPost={(body) => onPost(entityId, body)} />
        </div>

        {childGroups.length > 0 && (
          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              Groups in {title} ({childGroups.length})
            </h3>
            <div className="mt-2.5 flex flex-col gap-2">
              {childGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onOpen({ kind: "group", id: g.id })}
                  className="card p-3 text-left transition-colors hover:border-[var(--brand)]"
                >
                  <p className="text-[13.5px] font-semibold leading-tight">👥 {g.name}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{g.blurbMock}</p>
                  <p className="mt-1 text-[11px] text-[var(--ink-soft)]">{g.memberCountMock.toLocaleString()} members →</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {clubs.length > 0 && (
          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              Independent clubs ({clubs.length})
            </h3>
            <p className="mt-1 text-[12px] text-[var(--ink-soft)]">Belong to no network — anyone can join.</p>
            <div className="mt-2.5 flex flex-col gap-2">
              {clubs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpen({ kind: "group", id: c.id })}
                  className="card p-3 text-left transition-colors hover:border-[var(--brand)]"
                >
                  <p className="text-[13.5px] font-semibold leading-tight">⛺ {c.name}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{c.blurbMock}</p>
                  <p className="mt-1 text-[11px] text-[var(--ink-soft)]">{c.memberCountMock.toLocaleString()} members →</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Upcoming events</h3>
            <div className="mt-2.5 flex flex-col gap-2">
              {events.map((ev) => (
                <div key={ev.id} className="card p-3">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{ background: "color-mix(in srgb, var(--layer-event) 14%, var(--card))", color: "var(--layer-event)" }}
                  >
                    <CalendarIcon /> Event
                  </span>
                  <p className="mt-1.5 text-[13.5px] font-semibold leading-tight">{ev.name}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{ev.dateLabel}</p>
                  <p className="text-[12px] text-[var(--ink-soft)]">
                    {ev.venue}, {ev.city}
                  </p>
                  <button
                    onClick={() => toggleRsvp(ev.id)}
                    className={rsvped.has(ev.id) ? "btn btn-ghost btn-sm mt-2.5 w-full" : "btn btn-primary btn-sm mt-2.5 w-full"}
                  >
                    {rsvped.has(ev.id) ? "You're going ✓" : "RSVP"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
            Members worldwide {members.length > 0 ? `(${members.length})` : ""}
          </h3>
          {loading ? (
            <p className="mt-2 text-[13px] text-[var(--ink-soft)]">Loading members from around the world…</p>
          ) : members.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--ink-soft)]">No one here yet.</p>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {members.map((p) => (
                <ProfileListRow
                  key={p.id}
                  p={p}
                  conn={conn[p.id]}
                  hoveredId={hoveredMemberId}
                  now={now}
                  canAct={canAct}
                  onHover={setHoveredMemberId}
                  onUnhover={(id) => setHoveredMemberId((cur) => (cur === id ? null : cur))}
                  onConnect={onConnect}
                  onRespond={onRespond}
                  communityName={panel.kind === "public" ? undefined : title}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
