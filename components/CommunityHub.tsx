"use client";

import { useEffect, useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import { MOCK_GROUPS, MOCK_INSTITUTIONS, MOCK_EVENTS, MOCK_ANNOUNCEMENTS, membersInGroup } from "@/lib/prototypeData";
import { type Profile, type ConnState, ProfileListRow, CalendarIcon, InstitutionIcon } from "./MapPrimitives";

/**
 * The functional answer to "just layering pins on a map won't help" — a
 * community/alumni network isn't a pin, it's a place: a mission, who's in
 * it, what's happening, and what the admins are saying. Opens as a
 * slide-over (not a route) so it never loses the map underneath it.
 * Entirely mock data (lib/prototypeData.ts) except the member list, which
 * is a real filter over whichever profiles are already loaded.
 */
export default function CommunityHub({
  groupId,
  onClose,
  people,
  conn,
  onConnect,
  onRespond,
  canAct,
  now,
}: {
  groupId: string;
  onClose: () => void;
  people: Profile[];
  conn: Record<string, ConnState>;
  onConnect: (id: string, note?: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  canAct: boolean;
  now: number;
}) {
  const [rsvped, setRsvped] = useState<Set<string>>(new Set());
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const group = MOCK_GROUPS.find((g) => g.id === groupId);
  const institution = MOCK_INSTITUTIONS.find((i) => i.groupId === groupId);
  const events = MOCK_EVENTS.filter((e) => e.hostGroupId === groupId);
  const announcements = MOCK_ANNOUNCEMENTS.filter((a) => a.groupId === groupId);
  const members = membersInGroup(people, groupId);

  function toggleRsvp(id: string) {
    setRsvped((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!group) return null;

  const emoji = group.type === "alumni" ? "🎓" : group.type === "community" ? "👥" : "⛺";

  return (
    <>
      <div className="fixed inset-0 z-[1290] bg-black/20" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-[1300] w-full overflow-y-auto border-l border-[var(--line)] p-5 sm:w-[420px]"
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[26px] leading-none">{emoji}</span>
            <h2 className="mt-1.5 text-[19px] font-bold leading-tight">{group.name}</h2>
            <span className="pill mt-1.5" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
              {group.memberCountMock.toLocaleString()} members
            </span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 flex-none place-items-center rounded-full text-[var(--ink-soft)] hover:bg-[var(--sunk)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="mt-3 text-[13.5px] leading-5 text-[var(--ink)]">{group.missionMock}</p>

        {institution && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--ink-soft)]">
            <InstitutionIcon /> Based in {institution.city} ·{" "}
            {institution.kind === "university" ? "University" : institution.kind === "employer_alumni" ? "Alumni network" : "Institution"}
          </p>
        )}

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Pinned updates</h3>
          {announcements.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--ink-soft)]">No pinned updates yet.</p>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              {announcements.map((a) => (
                <div key={a.id} className="card flex gap-2.5 p-3">
                  <span className="avatar h-8 w-8 flex-none text-[11px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl(a.author)} alt="" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] leading-5 text-[var(--ink)]">
                      <span className="font-semibold">{a.author}</span> {a.body}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{a.dateLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Upcoming events</h3>
          {events.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--ink-soft)]">No upcoming events from this community yet.</p>
          ) : (
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
          )}
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
            Members {members.length > 0 ? `(${members.length} in view)` : ""}
          </h3>
          {members.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--ink-soft)]">
              No one in your current map view is in this community yet — try widening your radius or switching to My Network.
            </p>
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
                  communityName={group.name}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
