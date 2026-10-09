"use client";

import { cityById, mentorTier, type CircleMember } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import { IconAsk, IconCheck, IconHeart, IconSparkle } from "./Icons";

/**
 * The two profiles, side by side, with the reason between them.
 *
 * A list of candidates asks you to hold two people in your head and compare
 * them. A pair asks the only question that matters: is this one worth an
 * hour. Putting them level — same columns, same fields — also makes the
 * exchange legible at a glance, which is the thing that decides whether the
 * person sends the message.
 */
export default function MatchPair({
  me,
  other,
  side,
  why,
  theyOffer,
  youOffer,
  yearsGap,
}: {
  me: CircleMe;
  other: CircleMember;
  /** Which side of the pairing the viewer is on. */
  side: "mentee" | "mentor";
  why: string;
  theyOffer: string | null;
  youOffer: string | null;
  yearsGap: number;
}) {
  const tier = mentorTier(other.mentoredCount);
  const myCity = cityById(me.cityId)?.name ?? "";

  return (
    <div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl" style={{ background: "var(--line)" }}>
        <Column
          label={side === "mentee" ? "You" : "You — mentoring"}
          name={me.name}
          avatar={<Avatar name={me.name} photoUrl={me.photoUrl} style={me.avatarStyle} size={52} />}
          headline={me.headline || "—"}
          company={me.company || ""}
          sub={myCity}
          chips={side === "mentee" ? (me.interests ?? []).slice(0, 2) : (me.helpWith ?? []).slice(0, 2)}
          chipLabel={side === "mentee" ? "Here for" : "Can help with"}
        />
        <Column
          label={side === "mentee" ? "Suggested mentor" : "Suggested mentee"}
          name={other.name}
          avatar={<Avatar name={other.name} size={52} />}
          verified={other.verified}
          headline={other.headline}
          company={other.company}
          sub={`${cityById(other.cityId)?.name ?? ""} · Class of ${other.gradYear}`}
          chips={side === "mentee" ? other.helpWith.slice(0, 2) : other.lookingFor ? [other.lookingFor] : []}
          chipLabel={side === "mentee" ? "Can help with" : "Looking for"}
          tier={tier}
        />
      </div>

      {/* The gradient the whole thing runs on, stated between the two. */}
      <div className="relative -mt-2.5 flex justify-center">
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: "var(--brand)", color: "#fff", boxShadow: "0 0 0 3px var(--card)" }}
        >
          {Math.abs(yearsGap)} years apart
        </span>
      </div>

      <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          <IconSparkle size={12} /> Why this pair
        </p>
        <p className="mt-1 text-[13px] leading-5">{why}</p>
        {(theyOffer || youOffer) && (
          <div className="mt-2 flex flex-col gap-1">
            {theyOffer && (
              <p className="flex items-start gap-1.5 text-[12px] leading-4">
                <IconAsk size={13} className="mt-0.5 flex-none text-[var(--ink-soft)]" />
                <span>
                  They&rsquo;ll talk about <span className="font-semibold">{theyOffer}</span>
                </span>
              </p>
            )}
            {youOffer && (
              <p className="flex items-start gap-1.5 text-[12px] leading-4">
                <IconHeart size={13} className="mt-0.5 flex-none" style={{ color: "var(--brand)" }} />
                <span>
                  You can help with <span className="font-semibold">{youOffer}</span>
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Column({
  label,
  name,
  avatar,
  verified,
  headline,
  company,
  sub,
  chips,
  chipLabel,
  tier,
}: {
  label: string;
  name: string;
  avatar: React.ReactNode;
  verified?: boolean;
  headline: string;
  company: string;
  sub: string;
  chips: string[];
  chipLabel: string;
  tier?: string | null;
}) {
  return (
    <div className="flex flex-col items-center p-3 text-center" style={{ background: "var(--card)" }}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
      {avatar}
      <p className="mt-2 flex items-center gap-1 text-[13px] font-semibold leading-tight">
        <span className="min-w-0 truncate">{name}</span>
        {verified && <VerifiedBadge size={12} />}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-4 text-[var(--ink-soft)]">
        {headline}
        {company ? ` · ${company}` : ""}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-[var(--ink-soft)]">{sub}</p>

      {tier && (
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--brand)", color: "#fff" }}>
          <IconCheck size={10} /> {tier}
        </p>
      )}

      {chips.length > 0 && (
        <>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{chipLabel}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-1">
            {chips.map((c) => (
              <span key={c} className="pill" style={{ background: "var(--sunk)", color: "var(--ink)", fontSize: 10.5 }}>
                {c}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
