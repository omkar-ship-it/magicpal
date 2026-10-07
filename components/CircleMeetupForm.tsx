"use client";

import { useState } from "react";
import { entityById } from "@/lib/networks";
import { CIRCLE_CITIES, cityById, membersOf, type CircleEvent, type EventKind } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";

/**
 * Any member can call a meetup in a city. No approval, no admin.
 *
 * The permission falls out of reach rather than role: a meetup reaches only
 * the members who are actually in that city — eleven people in Berlin — so
 * there's nothing to gate. An institution-wide event reaches fourteen
 * thousand, which is why that one stays with admins. Same screen, and the
 * audience line below updates live so you can see which you're making.
 */
export default function CircleMeetupForm({
  me,
  onCancel,
  onCreate,
}: {
  me: CircleMe;
  onCancel: () => void;
  onCreate: (e: CircleEvent) => void;
}) {
  const [kind, setKind] = useState<EventKind>("meetup");
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [cityId, setCityId] = useState(me.cityId);
  const [dateLabel, setDateLabel] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [about, setAbout] = useState("");
  const [entityId, setEntityId] = useState(me.entityIds[0]);

  const online = kind === "online";
  const community = entityById(entityId);
  const all = membersOf(entityId);
  const locals = all.filter((m) => m.cityId === cityId);
  const audience = online ? all.length : locals.length;

  function create() {
    if (!name.trim()) return;
    const city = cityById(cityId);
    onCreate({
      id: `my-mu-${Date.now()}`,
      name: name.trim(),
      hostEntityId: entityId,
      kind,
      venue: online ? null : venue.trim() || null,
      cityId: online ? null : cityId,
      lat: online ? null : (city?.lat ?? null),
      lng: online ? null : (city?.lng ?? null),
      dateLabel: dateLabel.trim() || "This week",
      timeLabel: timeLabel.trim() || "Evening",
      daysAway: 3,
      liveNow: false,
      about: about.trim() || "No agenda. Come if you're free.",
      hostMemberId: "__me",
      joinUrl: online ? "https://meet.example.com/your-room" : undefined,
    });
  }

  return (
    <div>
      <span className="text-[26px] leading-none">📍</span>
      <h2 className="mt-1.5 text-[19px] font-bold leading-tight">Call a meetup</h2>
      <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
        You don&rsquo;t need anyone&rsquo;s permission for this. Pick a city, pick a night.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <span className="label">What kind</span>
          <div className="mt-1.5 flex gap-1.5">
            {(
              [
                { id: "meetup" as const, label: "In a city", detail: "Anyone can call one" },
                { id: "online" as const, label: "Online", detail: "The whole community" },
              ]
            ).map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className="flex-1 rounded-2xl border p-2.5 text-left"
                style={
                  kind === k.id
                    ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 7%, var(--card))" }
                    : { borderColor: "var(--line)" }
                }
              >
                <span className="block text-[12.5px] font-semibold">{k.label}</span>
                <span className="block text-[11px] text-[var(--ink-soft)]">{k.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label">Call it something</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={online ? "Fundraising Q&A, open mic" : "Thursday drinks, Indiranagar"}
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13.5px] outline-none focus:border-[var(--brand)]"
          />
        </label>

        {!online && (
          <>
            <label className="block">
              <span className="label">City</span>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
              >
                {CIRCLE_CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.country}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">Where exactly</span>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Toit, 100 Feet Road"
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13.5px] outline-none focus:border-[var(--brand)]"
              />
              <span className="mt-1 block text-[11px] text-[var(--ink-soft)]">
                The venue name is the precise part. The pin sits on the city, not your doorstep.
              </span>
            </label>
          </>
        )}

        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="label">When</span>
            <input
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              placeholder="Thu, Oct 16"
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13.5px] outline-none focus:border-[var(--brand)]"
            />
          </label>
          <label className="block flex-1">
            <span className="label">Time</span>
            <input
              value={timeLabel}
              onChange={(e) => setTimeLabel(e.target.value)}
              placeholder="7:30pm"
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13.5px] outline-none focus:border-[var(--brand)]"
            />
          </label>
        </div>

        <label className="block">
          <span className="label">Anything else</span>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={2}
            placeholder="No agenda. Come if you're free."
            className="mt-1.5 w-full resize-none rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13.5px] outline-none focus:border-[var(--brand)]"
          />
        </label>

        {me.entityIds.length > 1 && (
          <label className="block">
            <span className="label">For which community</span>
            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
            >
              {me.entityIds.map((id) => (
                <option key={id} value={id}>
                  {entityById(id)?.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* The audience line is the permission model, made visible. */}
        <div className="rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
          <p className="text-[12.5px] leading-5">
            {online ? (
              <>
                This reaches all <span className="font-semibold">{audience}</span> members of {community?.name}, wherever they are.
              </>
            ) : (
              <>
                This reaches the <span className="font-semibold">{audience}</span> {community?.name} {audience === 1 ? "member" : "members"} in{" "}
                {cityById(cityId)?.name} — nobody else is bothered by it.
              </>
            )}
          </p>
        </div>

        <div className="flex gap-1.5">
          <button onClick={onCancel} className="btn btn-ghost btn-sm flex-1">
            Cancel
          </button>
          <button onClick={create} disabled={!name.trim()} className="btn btn-primary btn-sm flex-1">
            {online ? "Schedule it" : "Call it"}
          </button>
        </div>
      </div>
    </div>
  );
}
