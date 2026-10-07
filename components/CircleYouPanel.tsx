"use client";

import { useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import { entityById } from "@/lib/networks";
import { CIRCLE_CITIES, cityById, inviteFor, membersOf, qualifiedName, type LocationMode } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import LocationModePicker from "./LocationModePicker";
import { IconBeacon, IconCopy, IconCheck } from "./Icons";

/**
 * You: where you let people see you, which communities you're in, and the
 * link to bring someone else in.
 *
 * The location control is the first thing on the page rather than buried in
 * settings, because in a network with no public side it's the only thing a
 * member is really deciding.
 */
export default function CircleYouPanel({
  me,
  beaconEventName,
  onMode,
  onCity,
  onStopBeacon,
  onOpenCommunity,
  onLeave,
}: {
  me: CircleMe;
  /** The event you're beaconing at, if any — shown so it can never be forgotten about. */
  beaconEventName: string | null;
  onMode: (m: LocationMode) => void;
  onCity: (id: string) => void;
  onStopBeacon: () => void;
  onOpenCommunity: (id: string) => void;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const city = cityById(me.cityId);

  async function copyInvite(code: string) {
    const url = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked; the link is on screen either way.
    }
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="avatar h-14 w-14 flex-none text-[15px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl(me.name)} alt="" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[19px] font-bold leading-tight">{me.name}</h2>
          <p className="text-[12.5px] text-[var(--ink-soft)]">
            {me.mode === "off" ? "Off the map" : `${city?.name}, ${city?.country}`}
          </p>
        </div>
      </div>

      {beaconEventName && (
        <div
          className="mt-4 flex items-center gap-2 rounded-2xl border p-3"
          style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 6%, var(--card))" }}
        >
          <IconBeacon size={16} className="flex-none" style={{ color: "var(--brand)" }} />
          <p className="min-w-0 flex-1 text-[12.5px] leading-4">
            Beaconing at <span className="font-semibold">{beaconEventName}</span>
          </p>
          <button onClick={onStopBeacon} className="btn btn-ghost btn-sm flex-none">
            Stop
          </button>
        </div>
      )}

      <div className="mt-5">
        <p className="label">Who can see where you are</p>
        <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
          Only members of the communities you&rsquo;re in. There is no public map here — nobody outside them can look you up at all.
        </p>
        <div className="mt-2">
          <LocationModePicker value={me.mode} onChange={onMode} />
        </div>

        {me.mode !== "off" && (
          <label className="mt-3 block">
            <span className="label">Your city</span>
            <select
              value={me.cityId}
              onChange={(e) => onCity(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
            >
              {CIRCLE_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-6">
        <p className="label">Your communities</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {me.entityIds.map((id) => {
            const e = entityById(id);
            const invite = inviteFor(id);
            if (!e) return null;
            return (
              <div key={id} className="card p-3">
                <button onClick={() => onOpenCommunity(id)} className="flex w-full items-center gap-2 text-left">
                  <span className="text-[17px] leading-none">{e.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold leading-tight">{qualifiedName(id)}</span>
                    <span className="block text-[11.5px] text-[var(--ink-soft)]">
                      {e.label} · {membersOf(id).length} on the map
                    </span>
                  </span>
                </button>
                {invite && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-xl p-2" style={{ background: "var(--sunk)" }}>
                    <code className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink-soft)]">/join/{invite.code}</code>
                    <button onClick={() => copyInvite(invite.code)} className="btn btn-ghost btn-sm flex-none">
                      {copied === invite.code ? <><IconCheck size={13} /> Copied</> : <><IconCopy size={13} /> Copy invite</>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--ink-soft)]">
          Anyone who opens that link is in the moment they give their name. The link is the verification — that&rsquo;s what a closed network
          has that an open map doesn&rsquo;t.
        </p>
      </div>

      <button onClick={onLeave} className="btn btn-ghost btn-sm mt-6">
        Leave and reset this prototype
      </button>
    </div>
  );
}
