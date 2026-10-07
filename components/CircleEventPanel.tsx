"use client";

import { avatarUrl } from "@/lib/avatar";
import { entityById } from "@/lib/networks";
import { attendeesOf, beaconsAt, cityById, type CircleEvent, type CircleMember } from "@/lib/circleData";

/**
 * An event, and the one thing an event makes possible that a map otherwise
 * can't: a beacon.
 *
 * Your location setting governs what the whole community sees, all the time.
 * A beacon is narrower on both axes — your precise spot, shared only with the
 * people at this event, only while it runs. That's why someone who keeps
 * themselves off the map entirely can still switch one on to be found at the
 * reunion, and have it end when the reunion does.
 */
export default function CircleEventPanel({
  event,
  beaconing,
  onBeacon,
  onOpenMember,
}: {
  event: CircleEvent;
  beaconing: boolean;
  onBeacon: (on: boolean) => void;
  onOpenMember: (id: string) => void;
}) {
  const host = entityById(event.hostEntityId);
  const city = cityById(event.cityId);
  const going = attendeesOf(event.id);
  const here = beaconsAt(event.id);
  const hereCount = here.length + (beaconing ? 1 : 0);

  return (
    <div>
      <span className="text-[26px] leading-none">📅</span>
      <h2 className="mt-1.5 text-[19px] font-bold leading-tight">{event.name}</h2>
      <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
        {host?.emoji} {host?.name}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
          {event.dateLabel} · {event.timeLabel}
        </span>
        <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
          {event.venue}, {city?.name}
        </span>
        <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
          {going.length} going
        </span>
      </div>

      {event.liveNow ? (
        <div
          className="mt-4 rounded-2xl border p-4"
          style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 6%, var(--card))" }}
        >
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
            <span className="beacon-dot" /> Happening now
          </p>
          <p className="mt-1.5 text-[14px] font-semibold">
            {hereCount} {hereCount === 1 ? "member is" : "members are"} beaconing at the venue
          </p>

          {beaconing ? (
            <>
              <p className="mt-1 text-[12.5px] leading-5 text-[var(--ink-soft)]">
                You&rsquo;re on the venue map. The {here.length} people here can see roughly where you&rsquo;re standing — nobody else in the
                community can, and it ends when the event does.
              </p>
              <button onClick={() => onBeacon(false)} className="btn btn-ghost btn-sm mt-3">
                Stop beaconing
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-[12.5px] leading-5 text-[var(--ink-soft)]">
                Turn on a beacon and the {here.length} people here can find you in the room. Precise, this event only, until it ends — your
                location setting for the rest of the community doesn&rsquo;t change.
              </p>
              <button onClick={() => onBeacon(true)} className="btn btn-primary btn-sm mt-3">
                📍 Beacon my location
              </button>
            </>
          )}

          {here.length > 0 && (
            <div className="mt-4">
              <p className="label">Here right now</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {here.slice(0, 18).map((m) => (
                  <button key={m.id} onClick={() => onOpenMember(m.id)} title={`${m.name} — ${m.headline}`} className="relative">
                    <span className="avatar h-9 w-9 text-[11px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl(m.name)} alt={m.name} />
                    </span>
                    <span className="beacon-dot absolute -bottom-0.5 -right-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl p-3 text-[12.5px] leading-5 text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
          Beacons switch on when the event starts — that&rsquo;s when being findable in a room is worth anything.
        </p>
      )}

      <p className="mt-4 text-[13.5px] leading-5">{event.about}</p>

      <div className="mt-5">
        <p className="label">Going ({going.length})</p>
        <div className="mt-2 flex flex-col gap-1">
          {going.slice(0, 40).map((m) => (
            <MemberRow key={m.id} m={m} beaconing={here.some((h) => h.id === m.id)} onClick={() => onOpenMember(m.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ m, beaconing, onClick }: { m: CircleMember; beaconing: boolean; onClick: () => void }) {
  const city = cityById(m.cityId);
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-2xl p-2 text-left transition-colors hover:bg-[var(--sunk)]">
      <span className="avatar h-9 w-9 flex-none text-[11px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl(m.name)} alt="" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-semibold leading-tight">{m.name}</span>
        <span className="block truncate text-[11.5px] text-[var(--ink-soft)]">
          {m.headline} · {m.company}
        </span>
      </span>
      {beaconing ? (
        <span className="flex flex-none items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--brand)" }}>
          <span className="beacon-dot" /> here
        </span>
      ) : (
        <span className="flex-none text-[11px] text-[var(--ink-soft)]">{city?.name}</span>
      )}
    </button>
  );
}
