"use client";

import { useState } from "react";
import { companyById } from "@/lib/prototypeData";
import { type Profile, type ConnState, ProfileListRow, BriefcaseIcon } from "./MapPrimitives";

/** A company's own page — who works there, what's open, and a way to reach people. */
export default function CompanyPanel({
  companyId,
  people,
  wide,
  conn,
  onConnect,
  onRespond,
  onMessage,
  onOpenEntity,
  canAct,
  now,
}: {
  companyId: string;
  people: Profile[];
  wide: boolean;
  conn: Record<string, ConnState>;
  onConnect: (id: string, note?: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  onMessage: (p: Profile) => void;
  onOpenEntity: (id: string) => void;
  canAct: boolean;
  now: number;
}) {
  const [following, setFollowing] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const co = companyById(companyId);
  if (!co) return null;

  // Real filter over the loaded worldwide roster — not a fabricated headcount.
  const here = people.filter((p) => p.company?.toLowerCase() === co.name.toLowerCase());

  return (
    <div>
      <div
        className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--layer-company) 22%, var(--card)), var(--card))" }}
      >
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
          style={{ background: "color-mix(in srgb, var(--layer-company) 16%, var(--card))", color: "var(--layer-company)" }}
        >
          <BriefcaseIcon /> Company
        </span>
        <h2 className="mt-2 text-[21px] font-bold leading-tight">{co.name}</h2>
        <p className="mt-1 text-[12.5px] text-[var(--ink-soft)]">
          {co.industry} · {co.city}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
            Founded {co.founded}
          </span>
          <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
            {co.sizeLabel}
          </span>
        </div>
        <button onClick={() => setFollowing((v) => !v)} className={following ? "btn btn-ghost btn-sm mt-3" : "btn btn-primary btn-sm mt-3"}>
          {following ? "Following ✓" : "Follow"}
        </button>
      </div>

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">About</h3>
        <p className="mt-2 text-[13px] leading-5">{co.about}</p>
      </div>

      {co.openRoles.length > 0 && (
        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
            Open roles ({co.openRoles.length})
          </h3>
          <div className="mt-2.5 flex flex-col gap-2">
            {co.openRoles.map((r) => (
              <div key={r.title} className="card flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{r.title}</p>
                  <p className="truncate text-[11.5px] text-[var(--ink-soft)]">{r.location}</p>
                </div>
                <span className="pill flex-none" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                  Ask for a referral
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          People here {here.length > 0 ? `(${here.length})` : ""}
        </h3>
        {here.length === 0 ? (
          <p className="mt-2 text-[13px] text-[var(--ink-soft)]">No one from {co.name} is on the map yet.</p>
        ) : (
          <div className={`mt-2.5 grid gap-2.5 ${wide ? "sm:grid-cols-2" : ""}`}>
            {here.map((p) => (
              <ProfileListRow
                key={p.id}
                p={p}
                conn={conn[p.id]}
                hoveredId={hoveredId}
                now={now}
                canAct={canAct}
                onHover={setHoveredId}
                onUnhover={(id) => setHoveredId((cur) => (cur === id ? null : cur))}
                onConnect={onConnect}
                onRespond={onRespond}
                onMessage={onMessage}
                onOpenEntity={onOpenEntity}
                communityName={co.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
