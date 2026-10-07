"use client";

import { avatarUrl } from "@/lib/avatar";
import { entityById } from "@/lib/networks";
import { attendeesOf, beaconsAt, cityById, memberById, type CircleEvent, type CircleMember } from "@/lib/circleData";
import { IconBeacon, IconCalendar, IconCheck, IconGlobe, IconPin } from "./Icons";

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
  going: imGoing,
  meName,
  onBeacon,
  onGoing,
  onOpenMember,
}: {
  event: CircleEvent;
  beaconing: boolean;
  /** Whether you've said you're coming. */
  going: boolean;
  meName: string;
  onBeacon: (on: boolean) => void;
  onGoing: (v: boolean) => void;
  onOpenMember: (id: string) => void;
}) {
  const host = entityById(event.hostEntityId);
  const city = event.cityId ? cityById(event.cityId) : null;
  // Who called it: the institution, or a member. Saying which is cheap and
  // lets member-run meetups exist without borrowing official authority.
  const hostMember = event.hostMemberId && event.hostMemberId !== "__me" ? memberById(event.hostMemberId) : null;
  const hostedByMe = event.hostMemberId === "__me";
  const online = event.kind === "online";
  const going = attendeesOf(event);
  const here = beaconsAt(event);
  const hereCount = here.length + (beaconing ? 1 : 0);

  return (
    <div>
      <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}>
        {online ? <IconGlobe size={21} /> : event.kind === "meetup" ? <IconPin size={21} /> : <IconCalendar size={21} />}
      </span>
      <h2 className="mt-2.5 text-[19px] font-bold leading-tight">{event.name}</h2>
      <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
        {host?.emoji} {host?.name}
        {hostMember ? ` · called by ${hostMember.name}` : hostedByMe ? " · called by you" : " · official"}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
          {event.dateLabel} · {event.timeLabel}
        </span>
        <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
          {online ? "Online" : [event.venue, city?.name].filter(Boolean).join(", ")}
        </span>
        {event.kind === "meetup" && (
          <span className="pill" style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}>
            Member meetup
          </span>
        )}
        <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
          {going.length + (imGoing || hostedByMe ? 1 : 0)} going
        </span>
      </div>

      {/* Saying you're coming is the one thing every event needs and the
          beacon isn't — a beacon only means anything once you're in the room. */}
      <div className="mt-3 flex items-center gap-1.5">
        {hostedByMe ? (
          <span className="pill" style={{ background: "color-mix(in srgb, var(--good) 14%, var(--card))", color: "var(--good)" }}>
            You called this
          </span>
        ) : imGoing ? (
          <>
            <span className="pill inline-flex items-center gap-1" style={{ background: "color-mix(in srgb, var(--good) 14%, var(--card))", color: "var(--good)" }}>
              <IconCheck size={13} /> You&rsquo;re going
            </span>
            <button onClick={() => onGoing(false)} className="btn btn-ghost btn-sm">
              Can&rsquo;t make it
            </button>
          </>
        ) : (
          <button onClick={() => onGoing(true)} className="btn btn-primary btn-sm">
            I&rsquo;m coming
          </button>
        )}
      </div>

      {online && (
        <div className="mt-4 rounded-2xl border border-[var(--line)] p-4">
          <p className="text-[13px] font-semibold">No room to find anyone in</p>
          <p className="mt-1 text-[12.5px] leading-5 text-[var(--ink-soft)]">
            Online events have no venue, so there&rsquo;s nothing to beacon at. What the map can still show is where everyone joining from
            actually is — which, for a class spread over {going.length > 0 ? "six continents" : "the world"}, is the more interesting picture.
          </p>
          <a href={event.joinUrl} className="btn btn-primary btn-sm mt-3 inline-block">
            Join the room
          </a>
        </div>
      )}

      {!online && event.liveNow ? (
        <div
          className="mt-4 rounded-2xl border p-4"
          style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 6%, var(--card))" }}
        >
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
            <IconBeacon size={15} /> Happening now
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
              <button onClick={() => onBeacon(true)} className="btn btn-primary btn-sm mt-3 flex items-center gap-1.5">
                <IconBeacon size={15} /> Beacon my location
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
        !online && (
          <p className="mt-4 rounded-2xl p-3 text-[12.5px] leading-5 text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
            Beacons switch on when the event starts — that&rsquo;s when being findable in a room is worth anything.
          </p>
        )
      )}

      <p className="mt-4 text-[13.5px] leading-5">{event.about}</p>

      <div className="mt-5">
        <p className="label">Going ({going.length + (imGoing || hostedByMe ? 1 : 0)})</p>
        <div className="mt-2 flex flex-col gap-1">
          {(imGoing || hostedByMe) && (
            <div className="flex items-center gap-2.5 rounded-2xl p-2" style={{ background: "var(--sunk)" }}>
              <span className="avatar h-9 w-9 flex-none text-[11px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl(meName)} alt="" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{meName}</span>
              <span className="flex-none text-[11px] text-[var(--ink-soft)]">{hostedByMe ? "host" : "you"}</span>
            </div>
          )}
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
