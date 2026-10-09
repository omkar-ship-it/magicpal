"use client";

import { entityById } from "@/lib/networks";
import { attendeesOf, causeById, cityById, formatAmount, mentorTier, postsAt, qualifiedName, rnd, timeOfferFor, type CircleEvent, type CircleMember } from "@/lib/circleData";
import Avatar from "./Avatar";
import VerifiedBadge, { UnverifiedChip } from "./VerifiedBadge";
import { IconAsk, IconBriefcase, IconCalendar, IconCity, IconChat, IconClock, IconHeart, IconHidden, IconPlus, IconPin, IconSparkle } from "./Icons";

function ago(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  const d = Math.round(minutes / 1440);
  return d < 7 ? `${d}d` : `${Math.round(d / 7)}w`;
}

/**
 * A member, in enough depth to be worth opening.
 *
 * The old version was an avatar, a job title and a Message button, which
 * told you who someone was and nothing about why you'd write to them. The
 * two blocks that earn their place here are "Ask me about" and "Looking
 * for": between them they turn a directory entry into an opening line,
 * which is the step everyone stalls on. Everything else — the career trail,
 * what they've posted, where you'll both be — exists to answer "do I
 * actually know this person's world".
 */
export default function MemberProfile({
  m,
  events,
  /** null in a closed community, where membership has already done this work. */
  connectState,
  common,
  onMessage,
  onConnect,
  onBook,
  freeBooking,
  onOpenEvent,
  onOpenCity,
}: {
  m: CircleMember;
  events: CircleEvent[];
  connectState?: "none" | "requested" | "connected" | null;
  /** Why this stranger might matter — only computed in the open network. */
  common?: string | null;
  onMessage: () => void;
  onConnect?: () => void;
  /** Booking time. Paid to a cause out in the open; free among alumni. */
  onBook?: () => void;
  /** Alumni booking is free — nothing has to filter a cold request here. */
  freeBooking?: boolean;
  onOpenEvent: (id: string) => void;
  onOpenCity: (cityId: string) => void;
}) {
  const city = cityById(m.cityId);
  const sharesACommunity = connectState == null;
  const offer = onBook ? timeOfferFor(m) : null;
  const tier = mentorTier(m.mentoredCount);
  const cause = offer ? causeById(offer.causeId) : null;
  const communities = m.entityIds.map((id) => entityById(id)).filter(Boolean);
  const theirPosts = m.entityIds
    .flatMap((id) => postsAt(id))
    .filter((p) => p.authorId === m.id)
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .slice(0, 3);
  const alsoGoing = events.filter((e) => attendeesOf(e).some((a) => a.id === m.id)).slice(0, 3);

  const mode =
    m.mode === "off"
      ? { icon: <IconHidden size={13} />, text: "Not sharing a location" }
      : m.mode === "live"
        ? { icon: <IconPin size={13} />, text: `${city?.name} · sharing live` }
        : { icon: <IconCity size={13} />, text: `${city?.name} · city only` };

  return (
    <div>
      <div className="flex items-start gap-3">
        <Avatar name={m.name} size={64} />
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-[19px] font-bold leading-tight">
            <span className="min-w-0 truncate">{m.name}</span>
            {m.verified && <VerifiedBadge size={15} label={`Verified alum of ${communities[0]?.name ?? "this network"}`} />}
          </h2>
          {!m.verified && (
            <span className="mt-1 inline-block">
              <UnverifiedChip />
            </span>
          )}
          <p className="mt-0.5 text-[13px] leading-5 text-[var(--ink-soft)]">
            {m.headline} · {m.company}
          </p>
          <button
            onClick={() => m.mode !== "off" && onOpenCity(m.cityId)}
            disabled={m.mode === "off"}
            className="mt-1 flex items-center gap-1 text-[11.5px] text-[var(--ink-soft)] disabled:cursor-default"
          >
            {mode.icon} {mode.text}
          </button>
        </div>
      </div>

      {common && (
        <p
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}
        >
          {common}
        </p>
      )}

      {/* In a closed community, membership already vouched for you both, so
          there is nothing to request. In the open network nothing has, so the
          first message is asked for rather than sent. */}
      {connectState == null || connectState === "connected" ? (
        <>
          <button onClick={onMessage} className="btn btn-primary btn-sm mt-3 flex w-full items-center justify-center gap-1.5">
            <IconChat size={15} /> Message {m.name.split(" ")[0]}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-[var(--ink-soft)]">
            {connectState === "connected"
              ? `You and ${m.name.split(" ")[0]} are connected.`
              : `No request needed — you're both in ${communities[0]?.name ?? "this community"}.`}
          </p>
        </>
      ) : connectState === "requested" ? (
        <>
          <button disabled className="btn btn-ghost btn-sm mt-3 w-full">
            Request sent
          </button>
          <p className="mt-1.5 text-center text-[11px] text-[var(--ink-soft)]">
            You&rsquo;ll be able to message once {m.name.split(" ")[0]} accepts.
          </p>
        </>
      ) : (
        <>
          <button onClick={onConnect} className="btn btn-primary btn-sm mt-3 flex w-full items-center justify-center gap-1.5">
            <IconPlus size={15} /> Ask to connect
          </button>
          <p className="mt-1.5 text-center text-[11px] text-[var(--ink-soft)]">
            Nobody has vouched for either of you here, so a first message is asked for rather than sent.
          </p>
        </>
      )}

      {tier && (
        <div className="mt-4 rounded-2xl border p-3.5" style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 5%, var(--card))" }}>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--brand)", color: "#fff" }}>
              <IconHeart size={11} /> {tier}
            </span>
            <span className="text-[11.5px] text-[var(--ink-soft)]">
              {m.mentoredCount} alumni mentored · {m.mentoredCount * 4} sessions
            </span>
          </div>

          {/* Written by the mentees themselves at the close of an arc. The
              point of putting it here is that mentoring is a status good:
              supply is the constraint in every programme like this, and
              making the giving visible is the only thing that reliably
              buys more of it. */}
          {m.endorsements.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {m.endorsements.map((e, i) => (
                <div key={i}>
                  <p className="text-[12.5px] leading-4">&ldquo;{e.line}&rdquo;</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">— mentee, {e.from}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {offer && cause && (
        <div className="mt-4 rounded-2xl border border-[var(--line)] p-3.5">
          <p className="label label-icon">
            <IconClock size={13} /> Open office hours
          </p>
          <p className="mt-0.5 text-[13px] leading-5">{offer.note}</p>

          {!freeBooking && (
            <div className="mt-2.5 flex items-start gap-2 rounded-xl p-2.5" style={{ background: "color-mix(in srgb, var(--brand) 7%, var(--card))" }}>
              <IconHeart size={14} className="mt-0.5 flex-none" style={{ color: "var(--brand)" }} />
              <span className="min-w-0 text-[12px] leading-4">
                {/* The distinction the whole mechanic rests on, stated before
                    anyone clicks: the expert is not being paid. */}
                <span className="font-semibold">{m.name.split(" ")[0]} isn&rsquo;t paid.</span> Your contribution goes to {cause.name} —{" "}
                {cause.area.toLowerCase()}.
              </span>
            </div>
          )}

          <button onClick={onBook} className="btn btn-primary btn-sm mt-2.5 flex w-full items-center justify-center gap-1.5">
            <IconClock size={14} />
            {freeBooking
              ? `Book ${offer.slots[0].minutes} minutes`
              : `Book ${offer.slots[0].minutes} min · ${formatAmount(offer.currency, offer.slots[0].amount)} to ${cause.name}`}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-[var(--ink-soft)]">
            {freeBooking
              ? `${offer.sessionsDone} alumni have taken a slot. No charge — you're in the same network.`
              : `${offer.sessionsDone} sessions · ${formatAmount(offer.currency, offer.raised)} raised`}
          </p>
        </div>
      )}

      {m.lookingFor && (
        <div
          className="mt-4 rounded-2xl border p-3"
          style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 6%, var(--card))" }}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
            <IconSparkle size={13} /> Looking for
          </p>
          <p className="mt-1 text-[13.5px] leading-5">{m.lookingFor}</p>
        </div>
      )}

      {m.helpWith.length > 0 && (
        <div className="mt-4">
          <p className="label label-icon">
            <IconAsk size={13} /> Ask them about
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.helpWith.map((h) => (
              <span key={h} className="pill" style={{ background: "var(--sunk)", color: "var(--ink)" }}>
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[13.5px] leading-5">{m.bio}</p>

      <div className="mt-5">
        <p className="label label-icon">
          <IconBriefcase size={13} /> Before this
        </p>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {m.past.map((job, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 text-[12.5px] leading-tight">
                <span className="font-semibold">{job.role}</span>
                <span className="text-[var(--ink-soft)]"> · {job.company}</span>
              </span>
              <span className="flex-none text-[11px] text-[var(--ink-soft)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                {job.years}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {/* Only call it shared when it is — in the open network these are
            simply the communities they belong to, and you're in none of them. */}
        <p className="label">{sharesACommunity ? "In common" : "Part of"}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {communities.map((e) => (
            <span
              key={e!.id}
              className="pill"
              style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}
              title={qualifiedName(e!.id)}
            >
              {e!.emoji} {e!.name}
            </span>
          ))}
        </div>
      </div>

      {alsoGoing.length > 0 && (
        <div className="mt-5">
          <p className="label label-icon">
            <IconCalendar size={13} /> Also going to
          </p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {alsoGoing.map((e) => (
              <button key={e.id} onClick={() => onOpenEvent(e.id)} className="tap card p-2.5 text-left hover:border-[var(--brand)]">
                <p className="text-[12.5px] font-semibold leading-tight">{e.name}</p>
                <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
                  {e.dateLabel} · {e.kind === "online" ? "Online" : (cityById(e.cityId ?? "")?.name ?? "")}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {theirPosts.length > 0 && (
        <div className="mt-5">
          <p className="label label-icon">
            <IconSparkle size={13} /> Recently
          </p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {theirPosts.map((p) => (
              <div key={p.id} className="rounded-2xl p-2.5" style={{ background: "var(--sunk)" }}>
                <p className="text-[12.5px] leading-4">{p.body}</p>
                <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                  {entityById(p.entityId)?.name} · {ago(p.minutesAgo)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The facts anyone actually checks before writing: how long they've
          been here, how quickly they reply, and how many people you both
          know. Useful because the first two set an expectation the message
          can be written against. */}
      <div className="mt-5">
        <p className="label">Details</p>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
          <span className="text-[var(--ink-soft)]">Graduated</span>
          <span className="font-medium">Class of {m.gradYear}</span>
          <span className="text-[var(--ink-soft)]">Based in</span>
          <span className="font-medium">{city?.name ?? "—"}{city ? `, ${city.country}` : ""}</span>
          <span className="text-[var(--ink-soft)]">On MagicPal</span>
          <span className="font-medium">{1 + (rnd(`since-${m.id}`) % 3)} years</span>
          <span className="text-[var(--ink-soft)]">Usually replies</span>
          <span className="font-medium">{["within a day", "within a few days", "within a week"][rnd(`reply-${m.id}`) % 3]}</span>
          <span className="text-[var(--ink-soft)]">Both know</span>
          <span className="font-medium">{2 + (rnd(`mutual-${m.id}`) % 12)} of the same people</span>
          <span className="text-[var(--ink-soft)]">Verified</span>
          <span className="font-medium">{m.verified ? "Yes, by the institution" : "Not yet"}</span>
        </div>
      </div>

      {(m.links.linkedin || m.links.site) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {m.links.linkedin && (
            <a
              href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(m.name)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              LinkedIn
            </a>
          )}
          {m.links.site && (
            <a href={`https://${m.links.site}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              {m.links.site}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
