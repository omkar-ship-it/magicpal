"use client";

import { useState } from "react";
import { causeById, formatAmount, slotsFor, timeOfferFor, type CircleMember } from "@/lib/circleData";
import Avatar from "./Avatar";
import { IconCheck, IconClock, IconHeart, IconSparkle } from "./Icons";

export type Booking = {
  memberId: string;
  minutes: number;
  amount: number;
  /** Carried rather than inferred — members are global and so are their currencies. */
  symbol: string;
  when: string;
  causeId: string;
  reference: string;
};

/**
 * Booking someone's time by giving to something they care about.
 *
 * Three steps, and the middle one is the point: pick a length, see exactly
 * where the money goes, confirm. The member is never paid and the screen
 * says so at every stage — the moment this reads as buying an hour of
 * somebody's attention, it stops being the thing that makes an open network
 * bearable and becomes the thing that ruins it.
 */
export default function BookTime({
  m,
  free,
  onCancel,
  onDone,
}: {
  m: CircleMember;
  /** Alumni booking: no contribution, because membership already vouched. */
  free?: boolean;
  onCancel: () => void;
  onDone: (b: Booking) => void;
}) {
  const offer = timeOfferFor(m);
  const cause = offer ? causeById(offer.causeId) : undefined;
  const days = slotsFor(m).filter((d) => d.times.length > 0);

  const [minutes, setMinutes] = useState(offer?.slots[0].minutes ?? 20);
  const [picked, setPicked] = useState<{ date: string; day: string; time: string } | null>(null);
  const [step, setStep] = useState<"pick" | "give" | "done">("pick");
  const [busy, setBusy] = useState(false);
  const [reference] = useState(() => `MP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

  if (!offer || !cause) return null;
  const slot = offer.slots.find((s) => s.minutes === minutes) ?? offer.slots[0];

  function confirm() {
    if (!picked) return;
    setBusy(true);
    // No payment rail behind this: the delay exists so the step reads like a
    // real one, and nothing is charged.
    setTimeout(() => {
      setBusy(false);
      setStep("done");
    }, 700);
  }

  if (step === "done") {
    return (
      <div className="py-4 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--good) 14%, var(--card))", color: "var(--good)" }}>
          <IconCheck size={26} />
        </span>
        <h2 className="mt-3 text-[19px] font-bold leading-tight">Booked with {m.name.split(" ")[0]}</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
          {picked?.day} {picked?.date} at {picked?.time} · {minutes} minutes
        </p>

        <div className="mt-4 rounded-2xl p-4 text-left" style={{ background: "var(--sunk)" }}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
            <IconHeart size={13} /> {free ? "Your slot" : "Your contribution"}
          </p>
          <p className="mt-1 text-[15px] font-bold">
            {free ? "No charge — same network" : `${formatAmount(offer.currency, slot.amount)} to ${cause.name}`}
          </p>
          <p className="mt-0.5 text-[12px] leading-4 text-[var(--ink-soft)]">{cause.blurb}</p>
          <p className="mt-2 text-[11px] text-[var(--ink-soft)]" style={{ fontVariantNumeric: "tabular-nums" }}>
            Reference {reference}
          </p>
        </div>

        <p className="mt-3 text-[11.5px] leading-4 text-[var(--ink-soft)]">
          Prototype — no payment was taken and nothing was sent to anyone.
        </p>

        <button
          onClick={() =>
            onDone({ memberId: m.id, minutes, amount: slot.amount, symbol: offer.currency.symbol, when: `${picked?.day} ${picked?.date}, ${picked?.time}`, causeId: cause.id, reference })
          }
          className="btn btn-primary btn-sm mt-4 w-full"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar name={m.name} size={48} />
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-bold leading-tight">Book {m.name.split(" ")[0]}</h2>
          <p className="truncate text-[12.5px] text-[var(--ink-soft)]">
            {m.headline} · {m.company}
          </p>
        </div>
      </div>

      {/* Said before anything is chosen, not after. */}
      {!free && (
      <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 6%, var(--card))" }}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
          <IconHeart size={13} /> Goes to {cause.name}
        </p>
        <p className="mt-1 text-[12.5px] leading-4">
          {m.name.split(" ")[0]} isn&rsquo;t paid for this. The contribution goes to {cause.area.toLowerCase()} — {cause.blurb}
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--ink-soft)]">
          {offer.sessionsDone} sessions so far · {formatAmount(offer.currency, offer.raised)} raised
        </p>
      </div>
      )}

      <p className="mt-3 text-[13px] leading-5">{offer.note}</p>

      {step === "pick" ? (
        <>
          <div className="mt-4">
            <p className="label label-icon">
              <IconClock size={13} /> How long
            </p>
            <div className="mt-1.5 flex gap-1.5">
              {offer.slots.map((s) => (
                <button
                  key={s.minutes}
                  onClick={() => setMinutes(s.minutes)}
                  className="tap flex-1 rounded-2xl border p-2.5 text-left"
                  style={
                    minutes === s.minutes
                      ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 7%, var(--card))" }
                      : { borderColor: "var(--line)" }
                  }
                  aria-pressed={minutes === s.minutes}
                >
                  <span className="block text-[13px] font-semibold">{s.minutes} minutes</span>
                  <span className="block text-[11.5px] text-[var(--ink-soft)]">{free ? "No charge" : `${formatAmount(offer.currency, s.amount)} to the cause`}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="label">When suits</p>
            <div className="mt-1.5 flex flex-col gap-2">
              {days.map((d) => (
                <div key={d.id}>
                  <p className="text-[11.5px] font-semibold text-[var(--ink-soft)]">
                    {d.day} {d.date}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {d.times.map((t) => {
                      const on = picked?.date === d.date && picked?.time === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setPicked({ date: d.date, day: d.day, time: t })}
                          className="tap rounded-full px-2.5 py-1.5 text-[12px] font-semibold"
                          style={
                            on
                              ? { background: "var(--brand)", color: "#fff" }
                              : { background: "var(--sunk)", color: "var(--ink)" }
                          }
                          aria-pressed={on}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex gap-1.5">
            <button onClick={onCancel} className="btn btn-ghost btn-sm flex-1">
              Cancel
            </button>
            <button
              onClick={() => (free && picked ? confirm() : setStep("give"))}
              disabled={!picked || busy}
              className="btn btn-primary btn-sm flex-1"
            >
              {free ? (busy ? "Booking…" : "Book it") : "Continue"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-[var(--line)] p-4">
            <p className="label label-icon">
              <IconSparkle size={13} /> What you&rsquo;re confirming
            </p>
            <div className="mt-2 flex flex-col gap-1.5 text-[13px]">
              <Row k="With" v={m.name} />
              <Row k="When" v={`${picked?.day} ${picked?.date}, ${picked?.time}`} />
              <Row k="Length" v={`${minutes} minutes`} />
              <Row k="To" v={cause.name} />
              <Row k="Contribution" v={formatAmount(offer.currency, slot.amount)} strong />
            </div>
          </div>

          <p className="mt-3 rounded-2xl p-3 text-[12px] leading-4 text-[var(--ink-soft)]" style={{ background: "var(--sunk)" }}>
            Prototype — this takes no card details and charges nothing. In a real build the contribution would go to {cause.name} directly,
            never through {m.name.split(" ")[0]}.
          </p>

          <div className="mt-4 flex gap-1.5">
            <button onClick={() => setStep("pick")} className="btn btn-ghost btn-sm flex-1">
              Back
            </button>
            <button onClick={confirm} disabled={busy} className="btn btn-primary btn-sm flex-1">
              {busy ? "Confirming…" : `Give ${formatAmount(offer.currency, slot.amount)} and book`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-[86px] flex-none text-[11.5px] text-[var(--ink-soft)]">{k}</span>
      <span className={`min-w-0 flex-1 ${strong ? "text-[15px] font-bold" : "font-medium"}`}>{v}</span>
    </div>
  );
}
