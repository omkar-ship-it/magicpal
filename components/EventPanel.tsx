"use client";

import { useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import { eventById } from "@/lib/prototypeData";
import { entityById } from "@/lib/networks";
import { type Profile, type ConnState, ProfileListRow, CalendarIcon } from "./MapPrimitives";
import Checkout, { type CheckoutResult } from "./Checkout";

/** An event's own page — the thing an event pin opens, not a popup card. */
export default function EventPanel({
  eventId,
  people,
  wide,
  onOpenEntity,
  registration,
  onRegistered,
  conn,
  onConnect,
  onRespond,
  onMessage,
  canAct,
  now,
}: {
  eventId: string;
  people: Profile[];
  wide: boolean;
  onOpenEntity: (id: string) => void;
  registration?: CheckoutResult;
  onRegistered: (eventId: string, result: CheckoutResult) => void;
  conn: Record<string, ConnState>;
  onConnect: (id: string, note?: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  onMessage: (p: Profile) => void;
  canAct: boolean;
  now: number;
}) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [rsvped, setRsvped] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const ev = eventById(eventId);
  if (!ev) return null;

  const host = ev.hostEntityId ? entityById(ev.hostEntityId) : undefined;
  // Who's going is a real filter over loaded profiles — the listed speakers,
  // plus anyone whose name hashes into this event's attendee slice.
  const going = people.filter((p) => ev.speakers.includes(p.name));

  return (
    <div>
      <div
        className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--layer-event) 22%, var(--card)), var(--card))" }}
      >
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
          style={{ background: "color-mix(in srgb, var(--layer-event) 16%, var(--card))", color: "var(--layer-event)" }}
        >
          <CalendarIcon /> Event
        </span>
        <h2 className="mt-2 text-[21px] font-bold leading-tight">{ev.name}</h2>
        <p className="mt-1 text-[13px] font-semibold">
          {ev.dateLabel} · {ev.timeLabel}
        </p>
        <p className="text-[12.5px] text-[var(--ink-soft)]">
          {ev.venue}, {ev.city}
        </p>
        {host && (
          <p className="mt-2 text-[12px] text-[var(--ink-soft)]">
            Hosted by{" "}
            <button onClick={() => onOpenEntity(host.id)} className="font-semibold text-[var(--brand)] hover:underline">
              {host.emoji} {host.name}
            </button>
          </p>
        )}
        <p className="mt-2 text-[12px] text-[var(--ink-soft)]">{ev.attendeesMock.toLocaleString()} attending</p>
      </div>

      {registration ? (
        <div className="card mt-4 flex items-center gap-3 p-4" style={{ borderColor: "var(--good)" }}>
          <span className="text-[22px]">🎟️</span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold">You&apos;re registered — {registration.tier.name}</p>
            <p className="text-[12px] text-[var(--ink-soft)]">
              Reference <span className="mono">{registration.reference}</span> · ticket in your email
            </p>
          </div>
        </div>
      ) : checkingOut && ev.tickets ? (
        <div className="mt-4">
          <Checkout
            title={`Register for ${ev.name}`}
            subtitle={`${ev.dateLabel} · ${ev.venue}`}
            tiers={ev.tickets}
            ctaLabel="Register"
            onCancel={() => setCheckingOut(false)}
            onDone={(r) => {
              setCheckingOut(false);
              onRegistered(ev.id, r);
            }}
          />
        </div>
      ) : ev.tickets ? (
        <button onClick={() => setCheckingOut(true)} className="btn btn-primary mt-4 w-full">
          Register — from {ev.tickets[0].priceLabel}
        </button>
      ) : (
        <button onClick={() => setRsvped((v) => !v)} className={rsvped ? "btn btn-ghost mt-4 w-full" : "btn btn-primary mt-4 w-full"}>
          {rsvped ? "You're going ✓" : "RSVP — free"}
        </button>
      )}

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">About</h3>
        <p className="mt-2 text-[13px] leading-5">{ev.about}</p>
      </div>

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Agenda</h3>
        <div className="mt-2.5 flex flex-col gap-2">
          {ev.agenda.map((a) => (
            <div key={a.time + a.item} className="flex gap-3">
              <span className="w-[108px] flex-none text-[12px] font-semibold text-[var(--ink-soft)]">{a.time}</span>
              <span className="text-[12.5px]">{a.item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Speakers</h3>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {ev.speakers.map((s) => (
            <span key={s} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3" style={{ background: "var(--sunk)" }}>
              <span className="avatar h-7 w-7 flex-none text-[10px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl(s)} alt="" />
              </span>
              <span className="text-[12.5px] font-semibold">{s}</span>
            </span>
          ))}
        </div>
      </div>

      {going.length > 0 && (
        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
            People you can reach ({going.length})
          </h3>
          <div className={`mt-2.5 grid gap-2.5 ${wide ? "sm:grid-cols-2" : ""}`}>
            {going.map((p) => (
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
                communityName={ev.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
