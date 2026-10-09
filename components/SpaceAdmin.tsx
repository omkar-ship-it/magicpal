"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  PLANS,
  attendeesOfSpace,
  getSpaces,
  makeCode,
  planById,
  saveSpaces,
  type Space,
  type SpaceKind,
} from "@/lib/spaces";
import Avatar from "./Avatar";
import { IconCalendar, IconCheck, IconChevronLeft, IconCopy, IconPeople, IconPlus, IconSparkle } from "./Icons";

/**
 * The organiser's side: make a space, pay for it, get something to share.
 *
 * The admin pays and the members don't, because the admin is the one with
 * the problem. Three hundred people in a hall with first-name badges, or
 * two hundred in a group chat who genuinely cannot answer "who here is in
 * Berlin" — that's an organiser's headache, and charging the attendees for
 * it is a product nobody buys.
 *
 * The whole flow is three steps and ends in a QR you can put on a slide.
 */
export default function SpaceAdmin() {
  const [spaces, setSpaces] = useState<Space[]>(() => getSpaces());
  const [open, setOpen] = useState<string | null>(null);
  const [making, setMaking] = useState(false);

  function persist(next: Space[]) {
    setSpaces(next);
    saveSpaces(next);
  }

  const current = spaces.find((s) => s.code === open);

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "var(--sunk)" }}>
      <div className="mx-auto w-full max-w-[640px]">
        {current ? (
          <SpaceDetail space={current} onBack={() => setOpen(null)} onDelete={() => { persist(spaces.filter((s) => s.code !== current.code)); setOpen(null); }} />
        ) : making ? (
          <CreateSpace
            onCancel={() => setMaking(false)}
            onCreate={(s) => {
              persist([s, ...spaces]);
              setMaking(false);
              setOpen(s.code);
            }}
          />
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[26px] font-bold leading-tight">Your spaces</h1>
                <p className="mt-1 text-[13px] leading-5 text-[var(--ink-soft)]">
                  A QR for a room, or a link for a group chat. People scan it, sign in, and see who else is there — and who they ought to
                  talk to.
                </p>
              </div>
              <button onClick={() => setMaking(true)} className="btn btn-primary btn-sm flex flex-none items-center gap-1.5">
                <IconPlus size={15} /> New
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {spaces.map((s) => {
                const people = attendeesOfSpace(s);
                return (
                  <button key={s.code} onClick={() => setOpen(s.code)} className="tap card p-4 text-left hover:border-[var(--brand)]">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }}>
                        {s.kind === "event" ? <IconCalendar size={17} /> : <IconPeople size={17} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold leading-tight">{s.name}</span>
                        <span className="block truncate text-[12px] text-[var(--ink-soft)]">
                          {s.kind === "event" ? s.dateLabel : "Group"} · {s.place} · {planById(s.planId).name}
                        </span>
                      </span>
                      <span className="flex flex-none -space-x-2">
                        {people.slice(0, 3).map((m) => (
                          <Avatar key={m.id} name={m.name} size={24} ring={2} />
                        ))}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-[11.5px] text-[var(--ink-soft)]">
                      magicpal.app/m/{s.code} · {people.length} joined
                    </p>
                  </button>
                );
              })}

              {spaces.length === 0 && (
                <div className="card p-6 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                    <IconSparkle size={22} />
                  </span>
                  <p className="mt-3 text-[14px] font-semibold">Nothing here yet</p>
                  <p className="mt-1 text-[12.5px] leading-5 text-[var(--ink-soft)]">
                    Make one for a meetup you&rsquo;re running or a group you admin. The first 25 people are free.
                  </p>
                  <button onClick={() => setMaking(true)} className="btn btn-primary btn-sm mt-3">
                    Make a space
                  </button>
                </div>
              )}
            </div>

            <p className="mt-5 text-center text-[11.5px] leading-4 text-[var(--ink-soft)]">
              Prototype — spaces live in this browser and no payment is taken.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── create */

function CreateSpace({ onCancel, onCreate }: { onCancel: () => void; onCreate: (s: Space) => void }) {
  const [kind, setKind] = useState<SpaceKind>("event");
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [place, setPlace] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [blurb, setBlurb] = useState("");
  const [planId, setPlanId] = useState("free");
  const [paying, setPaying] = useState(false);

  const plans = PLANS.filter((p) => p.forKind === "both" || p.forKind === kind);

  function create() {
    if (!name.trim()) return;
    setPaying(true);
    // No payment rail behind this; the pause exists so the step reads like
    // a real one and nothing is charged.
    setTimeout(() => {
      onCreate({
        code: makeCode(name),
        kind,
        name: name.trim(),
        host: host.trim() || "An organiser",
        blurb: blurb.trim() || (kind === "event" ? "Find the people worth talking to before you leave." : "See who's where, and actually connect."),
        place: place.trim() || (kind === "event" ? "The venue" : "Everywhere"),
        dateLabel: kind === "event" ? dateLabel.trim() || "This week" : undefined,
        planId,
        createdAtLabel: "just now",
      });
    }, 600);
  }

  return (
    <div className="card p-5">
      <button onClick={onCancel} className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--ink-soft)]">
        <IconChevronLeft size={14} /> Back
      </button>
      <h1 className="mt-2 text-[22px] font-bold leading-tight">Make a space</h1>

      <div className="mt-4 flex gap-1.5">
        {(
          [
            { id: "event" as const, label: "An event", detail: "A room, a day, a QR on a slide" },
            { id: "group" as const, label: "A group", detail: "A WhatsApp group, a link to drop in" },
          ]
        ).map((k) => (
          <button
            key={k.id}
            onClick={() => {
              setKind(k.id);
              setPlanId("free");
            }}
            className="tap flex-1 rounded-2xl border p-3 text-left"
            style={kind === k.id ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 7%, var(--card))" } : { borderColor: "var(--line)" }}
            aria-pressed={kind === k.id}
          >
            <span className="block text-[13.5px] font-semibold">{k.label}</span>
            <span className="block text-[11.5px] leading-4 text-[var(--ink-soft)]">{k.detail}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        <Field label={kind === "event" ? "Event name" : "Group name"} value={name} onChange={setName} placeholder={kind === "event" ? "Bengaluru Product Meetup" : "Climate Builders WhatsApp"} />
        <div className="flex gap-2">
          <Field label="Run by" value={host} onChange={setHost} placeholder="Your name or org" />
          <Field label={kind === "event" ? "Where" : "Mostly where"} value={place} onChange={setPlace} placeholder={kind === "event" ? "Church Street, Bengaluru" : "India + Singapore"} />
        </div>
        {kind === "event" && <Field label="When" value={dateLabel} onChange={setDateLabel} placeholder="Thu, Oct 23 · 6:30pm" />}
        <Field label="One line for the landing page" value={blurb} onChange={setBlurb} placeholder="What people get out of being there." />
      </div>

      <div className="mt-5">
        <p className="label">Plan</p>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlanId(p.id)}
              className="tap rounded-2xl border p-3 text-left"
              style={planId === p.id ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 7%, var(--card))" } : { borderColor: "var(--line)" }}
              aria-pressed={planId === p.id}
            >
              <span className="flex items-baseline gap-2">
                <span className="text-[14px] font-semibold">{p.name}</span>
                <span className="ml-auto text-[15px] font-bold">{p.priceLabel}</span>
              </span>
              <span className="block text-[11.5px] text-[var(--ink-soft)]">{p.period}</span>
              <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {p.perks.map((perk) => (
                  <span key={perk} className="flex items-center gap-1 text-[11px] text-[var(--ink-soft)]">
                    <IconCheck size={11} /> {perk}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button onClick={create} disabled={!name.trim() || paying} className="btn btn-primary mt-4 w-full">
        {paying ? "Creating…" : planId === "free" ? "Create space" : `Pay ${planById(planId).priceLabel} and create`}
      </button>
      <p className="mt-2 text-center text-[11px] leading-4 text-[var(--ink-soft)]">
        Prototype — no card details are taken and nothing is charged. Members never pay; you do.
      </p>
    </div>
  );
}

/* ───────────────────────────────────────────────── the QR itself */

function SpaceDetail({ space, onBack, onDelete }: { space: Space; onBack: () => void; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);
  const people = attendeesOfSpace(space);
  const plan = planById(space.planId);
  // Absolute, because the whole point is that it leaves this device.
  const url = typeof window === "undefined" ? `/m/${space.code}` : `${window.location.origin}/m/${space.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked; the link is on screen either way.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--ink-soft)]">
        <IconChevronLeft size={14} /> All spaces
      </button>

      <div className="card mt-2 p-5">
        <h1 className="text-[22px] font-bold leading-tight">{space.name}</h1>
        <p className="mt-1 text-[12.5px] text-[var(--ink-soft)]">
          {space.kind === "event" ? `${space.dateLabel} · ${space.place}` : `Group · ${space.place}`} · run by {space.host}
        </p>

        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl p-4 sm:flex-row sm:items-start" style={{ background: "var(--sunk)" }}>
          {/* White ground and a quiet margin, because a QR on a tinted card
              is a QR that half the phones in the room won't read. */}
          <div className="flex-none rounded-xl bg-white p-3">
            <QRCodeCanvas value={url} size={148} marginSize={0} level="M" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Share this</p>
            <p className="mt-1 break-all text-[13px] font-medium">{url}</p>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              <button onClick={copy} className="btn btn-primary btn-sm flex items-center gap-1.5">
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />} {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${space.name} — see who's here and who to talk to: ${url}`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
                Send to WhatsApp
              </a>
            </div>
            <p className="mt-2 text-[11.5px] leading-4 text-[var(--ink-soft)]">
              {space.kind === "event"
                ? "Put the code on a slide, a badge or the door. People scan it and they're in."
                : "Pin the link in the group. Nobody installs anything."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl" style={{ background: "var(--line)" }}>
          {[
            { n: people.length, l: "joined" },
            { n: plan.cap, l: "cap" },
            { n: new Set(people.map((p) => p.cityId)).size, l: "cities" },
          ].map((s) => (
            <div key={s.l} className="px-3 py-2.5 text-center" style={{ background: "var(--card)" }}>
              <p className="text-[18px] font-bold leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
                {s.n}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="label">Who&rsquo;s in</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {people.slice(0, 24).map((m) => (
              <Avatar key={m.id} name={m.name} size={34} title={`${m.name} — ${m.headline}`} />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <a href={url} className="btn btn-ghost btn-sm flex-1 text-center">
            Open it as a member
          </a>
          <button onClick={onDelete} className="btn btn-ghost btn-sm flex-none" style={{ color: "var(--warn)" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block flex-1">
      <span className="label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-[var(--brand)]"
      />
    </label>
  );
}
