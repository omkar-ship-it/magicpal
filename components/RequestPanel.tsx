"use client";

import { avatarUrl } from "@/lib/avatar";
import { sharedContextFor } from "@/lib/networks";

export type IncomingRequest = {
  /** Connection row id for a real request; a local id for a seeded one. */
  id: string;
  name: string;
  headline: string | null;
  photoUrl: string | null;
  note: string | null;
  timeLabel: string;
  /** Real requests answer through the API; seeded ones are local only. */
  real: boolean;
};

/**
 * Someone asking to connect. Previously this lived on a separate /requests
 * page behind a header nav, which meant the one thing on MagicPal that is
 * genuinely time-sensitive — a person waiting on an answer — was the one
 * thing you had to leave the map to find.
 */
export default function RequestPanel({
  request,
  verdict,
  onRespond,
  onMessage,
}: {
  request: IncomingRequest;
  verdict?: "in" | "out";
  onRespond: (r: IncomingRequest, accept: boolean) => void;
  onMessage: (name: string) => void;
}) {
  const shared = sharedContextFor(request.name);

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="avatar h-14 w-14 flex-none text-[15px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={request.photoUrl ?? avatarUrl(request.name)} alt="" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold leading-tight">{request.name}</h2>
          {request.headline && <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">{request.headline}</p>}
          <p className="mt-1 text-[11.5px] text-[var(--ink-soft)]">Asked to connect {request.timeLabel}</p>
        </div>
      </div>

      {shared && (
        <p
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}
        >
          {shared.emoji} You&rsquo;re both in {shared.label}
        </p>
      )}

      {request.note && (
        <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
          <p className="text-[13.5px] leading-5">“{request.note}”</p>
        </div>
      )}

      {verdict === "in" ? (
        <div className="mt-4">
          <p className="text-[13px] font-semibold" style={{ color: "var(--good)" }}>
            Connected — you can message each other now.
          </p>
          <button onClick={() => onMessage(request.name)} className="btn btn-primary btn-sm mt-2">
            Message {request.name.split(" ")[0]}
          </button>
        </div>
      ) : verdict === "out" ? (
        <p className="mt-4 text-[13px] text-[var(--ink-soft)]">Declined. They aren&rsquo;t told who turned them down.</p>
      ) : (
        <div className="mt-4 flex gap-1.5">
          <button onClick={() => onRespond(request, false)} className="btn btn-ghost btn-sm flex-1">
            Decline
          </button>
          <button onClick={() => onRespond(request, true)} className="btn btn-primary btn-sm flex-1">
            Accept
          </button>
        </div>
      )}
    </div>
  );
}
