"use client";

import { useState } from "react";
import { entityById } from "@/lib/networks";
import { CAUSES, CIRCLE_CITIES, causeById, cityById, inviteFor, membersOf, qualifiedName, type LocationMode } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import LocationModePicker from "./LocationModePicker";
import AvatarPicker from "./AvatarPicker";
import Verification from "./Verification";
import { IconAsk, IconClock, IconHeart, IconSparkle } from "./Icons";
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
  onAvatar,
  onField,
  openNetwork,
  activeEntityId,
  onOpenMember,
  onStopBeacon,
  onOpenCommunity,
  onLeave,
}: {
  me: CircleMe;
  /** The event you're beaconing at, if any — shown so it can never be forgotten about. */
  beaconEventName: string | null;
  onMode: (m: LocationMode) => void;
  onCity: (id: string) => void;
  onAvatar: (next: { photoUrl: string | null; style: string }) => void;
  onField: (patch: Partial<CircleMe>) => void;
  /** The time-for-a-cause offer only exists in the open network. */
  openNetwork?: boolean;
  /** Verification is per institution, so it needs to know which one you're looking at. */
  activeEntityId?: string;
  onOpenMember?: (id: string) => void;
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
      <div>
        <h2 className="truncate text-[19px] font-bold leading-tight">{me.name}</h2>
        {(me.headline || me.company) && (
          <p className="text-[13px] text-[var(--ink-soft)]">{[me.headline, me.company].filter(Boolean).join(" · ")}</p>
        )}
        <p className="text-[12.5px] text-[var(--ink-soft)]">
          {me.mode === "off" ? "Off the map" : `${city?.name}, ${city?.country}`}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--line)] p-3">
        <AvatarPicker name={me.name} photoUrl={me.photoUrl ?? null} style={me.avatarStyle ?? "notionists"} onChange={onAvatar} />
      </div>

      {/* The same fields every other member's profile shows, so the demo can
          walk both sides of the thing: what you see, and what you fill in. */}
      <div className="mt-5 flex flex-col gap-3.5">
        <div className="flex gap-2">
          <Field label="What you do" value={me.headline} placeholder="Head of Product" onChange={(v) => onField({ headline: v })} />
          <Field label="Where" value={me.company ?? ""} placeholder="Northwind" onChange={(v) => onField({ company: v })} />
        </div>

        <Field
          label="A line about you"
          value={me.bio ?? ""}
          placeholder="What you're working on, and what you care about."
          onChange={(v) => onField({ bio: v })}
          multiline
        />

        <div>
          <p className="label label-icon">
            <IconAsk size={13} /> Ask me about
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
            Comma-separated. This is what makes you worth messaging rather than just findable.
          </p>
          <input
            value={(me.helpWith ?? []).join(", ")}
            onChange={(e) =>
              onField({
                helpWith: e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
            placeholder="pricing, hiring engineers, entering India"
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
          />
          {(me.helpWith ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(me.helpWith ?? []).map((h) => (
                <span key={h} className="pill" style={{ background: "var(--sunk)", color: "var(--ink)" }}>
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="label label-icon">
            <IconSparkle size={13} /> Looking for
          </p>
          <input
            value={me.lookingFor ?? ""}
            onChange={(e) => onField({ lookingFor: e.target.value || null })}
            placeholder="A senior backend hire, Bengaluru or remote"
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
          />
          <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
            Leave it empty when you&rsquo;re not asking for anything — a roster where everyone wants something reads as a jobs board.
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

      {openNetwork && <OfferEditor me={me} onField={onField} />}

      {!openNetwork && activeEntityId && onOpenMember && (
        <Verification me={me} entityId={activeEntityId} onUpdate={onField} onOpenMember={onOpenMember} />
      )}

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

function Field({
  label,
  value,
  placeholder,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onChange: (v: string) => void;
}) {
  const cls =
    "mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]";
  return (
    <label className="block flex-1">
      <span className="label">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className={`${cls} resize-none`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </label>
  );
}

/**
 * Your own office hours.
 *
 * The same mechanic from the other side: you give time, somebody gives to a
 * cause you picked, and no money comes near you. Worth building both halves
 * for a demo — the offer only reads as generous once you've seen how little
 * the person offering gets out of it.
 */
function OfferEditor({ me, onField }: { me: CircleMe; onField: (patch: Partial<CircleMe>) => void }) {
  const offer = me.offer ?? null;
  const cause = offer ? causeById(offer.causeId) : null;
  const symbol = me.cityId === "blr" || me.cityId === "bom" || me.cityId === "del" || me.cityId === "hyd" ? "₹" : "$";

  return (
    <div className="mt-6 rounded-2xl border border-[var(--line)] p-3.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="label label-icon mb-0">
            <IconClock size={13} /> Offer your time
          </p>
          <p className="mt-0.5 text-[11.5px] leading-4 text-[var(--ink-soft)]">
            People book a slot by giving to a cause you choose. Nothing comes to you.
          </p>
        </div>
        <button
          onClick={() =>
            onField({
              offer: offer ? null : { causeId: CAUSES[0].id, note: "Come with one question. We'll get further than with five.", base: symbol === "₹" ? 2000 : 25 },
            })
          }
          className="btn btn-ghost btn-sm flex-none"
        >
          {offer ? "Turn off" : "Turn on"}
        </button>
      </div>

      {offer && (
        <div className="mt-3 flex flex-col gap-3">
          <label className="block">
            <span className="label">Cause</span>
            <select
              value={offer.causeId}
              onChange={(e) => onField({ offer: { ...offer, causeId: e.target.value } })}
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
            >
              {CAUSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.area}
                </option>
              ))}
            </select>
            {cause && <span className="mt-1 block text-[11px] leading-4 text-[var(--ink-soft)]">{cause.blurb}</span>}
          </label>

          <label className="block">
            <span className="label">What you&rsquo;re useful for</span>
            <textarea
              value={offer.note}
              onChange={(e) => onField({ offer: { ...offer, note: e.target.value } })}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
            />
          </label>

          <label className="block">
            <span className="label">Contribution for 20 minutes</span>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[15px] font-semibold">{symbol}</span>
              <input
                type="number"
                min={0}
                value={offer.base}
                onChange={(e) => onField({ offer: { ...offer, base: Math.max(0, Number(e.target.value) || 0) } })}
                className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--brand)]"
              />
            </div>
          </label>

          <p className="flex items-start gap-2 rounded-xl p-2.5 text-[12px] leading-4" style={{ background: "color-mix(in srgb, var(--brand) 7%, var(--card))" }}>
            <IconHeart size={14} className="mt-0.5 flex-none" style={{ color: "var(--brand)" }} />
            <span>
              20 min for {symbol}
              {offer.base.toLocaleString()}, 45 min for {symbol}
              {(offer.base * 2).toLocaleString()} — all of it to {cause?.name ?? "your cause"}.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
