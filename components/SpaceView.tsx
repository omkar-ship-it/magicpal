"use client";

import { useMemo, useState } from "react";
import { cityById, type CircleMember } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import { SPACE_INTERESTS, attendeesOfSpace, hereNow, planById, spaceByCode, type Space } from "@/lib/spaces";
import { matchesFor } from "@/lib/matching";
import { matchesQuery } from "./SearchBar";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import {
  IconCalendar,
  IconCheck,
  IconPeople,
  IconSearch,
  IconSend,
  IconSparkle,
} from "./Icons";

const KEY = "mp_space_me";

function loadMe(code: string): CircleMe | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, CircleMe>;
    return all[code] ?? null;
  } catch {
    return null;
  }
}

function storeMe(code: string, me: CircleMe) {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, CircleMe>;
    all[code] = me;
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Private browsing or a full quota — the session still works.
  }
}

/**
 * What someone gets after scanning the code on the slide.
 *
 * The bar is low and specific: a person standing in a hall with a drink in
 * one hand has about twenty seconds of patience. So there's no onboarding,
 * no profile to fill in, no app to install — sign in, pick a couple of
 * things you're here for, and the room is a list of faces with reasons
 * attached. "For you" is first because the entire problem is that
 * "everyone" is three hundred people and four of them matter.
 */
export default function SpaceView({ code }: { code: string }) {
  const [space] = useState<Space | null>(() => spaceByCode(code));
  const [me, setMe] = useState<CircleMe | null>(() => loadMe(code));

  if (!space) return <Missing />;
  if (!me)
    return (
      <SpaceJoin
        space={space}
        onJoined={(next) => {
          storeMe(code, next);
          setMe(next);
        }}
      />
    );
  return <Room space={space} me={me} />;
}

/* ─────────────────────────────────────────────────── the landing */

function SpaceJoin({ space, onJoined }: { space: Space; onJoined: (me: CircleMe) => void }) {
  const people = useMemo(() => attendeesOfSpace(space), [space]);
  const here = useMemo(() => hereNow(space, people), [space, people]);
  const [step, setStep] = useState<"intro" | "about">("intro");
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [company, setCompany] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  /**
   * Mocked. A real build hands off to LinkedIn and comes back with the name,
   * role and company already filled — which is the only reason this is one
   * tap instead of a form, and the reason it's worth doing at all for
   * somebody holding a drink.
   */
  function signIn() {
    setName("Omkar Bandi");
    setHeadline("Founder");
    setCompany("MagicPal");
    setStep("about");
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "var(--sunk)" }}>
      <div className="mx-auto w-full max-w-[460px]">
        <div className="card overflow-hidden p-0">
          <div className="p-6" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--brand) 12%, var(--card)), var(--card))" }}>
            <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: "var(--brand)", color: "#fff" }}>
              {space.kind === "event" ? <IconCalendar size={22} /> : <IconPeople size={22} />}
            </span>
            <p className="mt-3 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              {space.kind === "event" ? "You're at" : "You're in"}
            </p>
            <h1 className="mt-0.5 text-[24px] font-bold leading-tight">{space.name}</h1>
            <p className="mt-1 text-[12.5px] text-[var(--ink-soft)]">
              {space.kind === "event" ? `${space.dateLabel} · ${space.place}` : space.place} · run by {space.host}
            </p>
            <p className="mt-2.5 text-[13.5px] leading-5">{space.blurb}</p>

            <div className="mt-3 flex items-center gap-2">
              <span className="flex flex-none -space-x-2.5">
                {people.slice(0, 6).map((m) => (
                  <Avatar key={m.id} name={m.name} size={30} ring={2} />
                ))}
              </span>
              <span className="min-w-0 text-[12px] text-[var(--ink-soft)]">
                {people.length} here
                {space.kind === "event" && here.length > 0 ? ` · ${here.length} in the room now` : ""}
              </span>
            </div>
          </div>

          <div className="p-6">
            {step === "intro" ? (
              <>
                <button onClick={signIn} className="btn btn-primary w-full">
                  Continue with LinkedIn
                </button>
                <p className="mt-2 text-center text-[11.5px] leading-4 text-[var(--ink-soft)]">
                  So your name and what you do are right without typing them. Nothing is posted anywhere, and only people in this{" "}
                  {space.kind === "event" ? "room" : "group"} can see you.
                </p>
                <p className="mt-3 text-center text-[11px] text-[var(--ink-soft)]">Prototype — this signs you in as a demo profile.</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <Avatar name={name} size={44} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold leading-tight">{name}</p>
                    <p className="truncate text-[12px] text-[var(--ink-soft)]">
                      {headline} · {company}
                    </p>
                  </div>
                  <span className="ml-auto flex flex-none items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--good)" }}>
                    <IconCheck size={12} /> From LinkedIn
                  </span>
                </div>

                <p className="label mt-4">What are you here for?</p>
                <p className="mt-0.5 text-[11.5px] leading-4 text-[var(--ink-soft)]">
                  Pick two or three. It&rsquo;s the only thing that decides who you get shown.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SPACE_INTERESTS.slice(0, 12).map((t) => {
                    const on = interests.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => setInterests((cur) => (on ? cur.filter((x) => x !== t) : cur.length >= 5 ? cur : [...cur, t]))}
                        className="tap rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold"
                        style={on ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" } : { background: "var(--sunk)", color: "var(--ink-soft)" }}
                        aria-pressed={on}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    onJoined({
                      name,
                      headline,
                      company,
                      cityId: "blr",
                      mode: "base",
                      entityIds: [`space:${space.code}`],
                      beaconEventId: null,
                      interests,
                    })
                  }
                  className="btn btn-primary mt-4 w-full"
                >
                  See who&rsquo;s here
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────── the room */

function Room({ space, me }: { space: Space; me: CircleMe }) {
  const people = useMemo(() => attendeesOfSpace(space), [space]);
  const here = useMemo(() => hereNow(space, people), [space, people]);
  const [tab, setTab] = useState<"foryou" | "everyone">("foryou");
  const [q, setQ] = useState("");
  const [sent, setSent] = useState<string[]>([]);

  const matches = useMemo(() => matchesFor(me, people, { limit: 5 }), [me, people]);
  const shown = people.filter((m) => matchesQuery(m, q.trim().toLowerCase()));

  return (
    <div className="min-h-screen" style={{ background: "var(--sunk)" }}>
      <div className="mx-auto w-full max-w-[560px] px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ background: "var(--brand)", color: "#fff" }}>
            {space.kind === "event" ? <IconCalendar size={19} /> : <IconPeople size={19} />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold leading-tight">{space.name}</h1>
            <p className="truncate text-[11.5px] text-[var(--ink-soft)]">
              {people.length} here
              {space.kind === "event" && here.length > 0 ? ` · ${here.length} in the room now` : ""} · {planById(space.planId).name}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-1 rounded-2xl p-1" style={{ background: "var(--card)" }}>
          {(
            [
              { id: "foryou" as const, label: `For you (${matches.length})` },
              { id: "everyone" as const, label: `Everyone (${people.length})` },
            ]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="tap flex-1 rounded-xl py-2 text-[12.5px] font-semibold"
              style={tab === t.id ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" } : { color: "var(--ink-soft)" }}
              aria-pressed={tab === t.id}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "foryou" ? (
          <div className="mt-4 flex flex-col gap-2.5">
            <p className="text-[12px] leading-4 text-[var(--ink-soft)]">
              {space.kind === "event"
                ? "Out of everyone in the room, these are the ones worth crossing it for."
                : "Out of everyone in the group, these are the ones worth a message."}
            </p>
            {matches.map((mt) => (
              <PersonCard
                key={mt.member.id}
                m={mt.member}
                why={mt.why}
                hereNow={here.some((h) => h.id === mt.member.id)}
                sent={sent.includes(mt.member.id)}
                onSend={() => setSent((s) => [...s, mt.member.id])}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: "var(--card)" }}>
              <IconSearch size={15} className="flex-none text-[var(--ink-soft)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, role, company, a topic…"
                className="min-w-0 flex-1 border-none bg-transparent py-1 text-[13px] outline-none"
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {shown.slice(0, 60).map((m) => (
                <PersonCard
                  key={m.id}
                  m={m}
                  hereNow={here.some((h) => h.id === m.id)}
                  sent={sent.includes(m.id)}
                  onSend={() => setSent((s) => [...s, m.id])}
                />
              ))}
              {shown.length === 0 && (
                <p className="rounded-2xl p-4 text-center text-[12.5px] text-[var(--ink-soft)]" style={{ background: "var(--card)" }}>
                  Nobody here matches that.
                </p>
              )}
            </div>
          </>
        )}

        <p className="mt-6 text-center text-[11px] leading-4 text-[var(--ink-soft)]">
          Prototype — people and messages are mocked. Only {space.host} pays for this; you never do.
        </p>
      </div>
    </div>
  );
}

function PersonCard({
  m,
  why,
  hereNow: isHere,
  sent,
  onSend,
}: {
  m: CircleMember;
  why?: string;
  hereNow: boolean;
  sent: boolean;
  onSend: () => void;
}) {
  return (
    <div className="card p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="relative flex-none">
          <Avatar name={m.name} size={44} />
          {isHere && (
            <span className="beacon-dot absolute -bottom-0.5 -right-0.5" style={{ boxShadow: "0 0 0 2px var(--card)" }} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[14px] font-semibold leading-tight">
            <span className="min-w-0 truncate">{m.name}</span>
            {m.verified && <VerifiedBadge size={12} />}
          </p>
          <p className="truncate text-[12px] text-[var(--ink-soft)]">
            {m.headline} · {m.company}
          </p>
          <p className="truncate text-[11.5px] text-[var(--ink-soft)]">
            {cityById(m.cityId)?.name}
            {isHere ? " · in the room now" : ""}
          </p>
        </div>
      </div>

      {why && <p className="mt-2 text-[12.5px] leading-4">{why}</p>}

      {m.helpWith.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.helpWith.slice(0, 3).map((h) => (
            <span key={h} className="pill" style={{ background: "var(--sunk)", color: "var(--ink)" }}>
              {h}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={onSend}
        disabled={sent}
        className={`btn btn-sm mt-2.5 flex w-full items-center justify-center gap-1.5 ${sent ? "btn-ghost" : "btn-primary"}`}
      >
        {sent ? (
          <>
            <IconCheck size={14} /> Said hello
          </>
        ) : (
          <>
            <IconSend size={14} /> Say hello
          </>
        )}
      </button>
    </div>
  );
}

function Missing() {
  return (
    <div className="grid min-h-screen place-items-center px-4" style={{ background: "var(--sunk)" }}>
      <div className="card w-full max-w-[420px] p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
          <IconSparkle size={22} />
        </span>
        <h1 className="mt-3 text-[19px] font-bold leading-tight">That space isn&rsquo;t here</h1>
        <p className="mt-1.5 text-[12.5px] leading-5 text-[var(--ink-soft)]">
          Spaces in this prototype live in the browser that made them, so a link only opens on that device. Make one of your own to see
          how it works.
        </p>
        <a href="/spaces" className="btn btn-primary btn-sm mt-4 inline-block">
          Make a space
        </a>
      </div>
    </div>
  );
}
