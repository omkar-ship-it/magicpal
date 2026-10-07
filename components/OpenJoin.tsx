"use client";

import { useMemo, useState } from "react";
import {
  CIRCLE_CITIES,
  CIRCLE_MEMBERS,
  OPEN_ID,
  OPEN_INTERESTS,
  cityById,
  continentOf,
  type LocationMode,
} from "@/lib/circleData";
import { setMe, type CircleMe } from "@/lib/circleMe";
import LocationModePicker from "./LocationModePicker";
import InviteMap from "./InviteMap";
import { markJustJoined } from "./CircleWelcome";
import { IconChevronDown, IconGlobe, IconPeople } from "./Icons";

/**
 * Walking in, rather than being let in.
 *
 * The closed network's invite does two jobs: it verifies you, and it tells
 * you what you're joining. Out here neither is given, so this screen has to
 * earn both. It shows the whole map up front — the only honest argument for
 * an open network is its size — and asks the one question that makes a map
 * of strangers navigable: what are you here for. Those answers are what
 * surfaces "can help with pricing" on someone you've never met.
 *
 * The privacy default is deliberately one notch more conservative than the
 * closed version's: your city, never live, because the people who can see
 * you haven't been vouched for by anything.
 */
export default function OpenJoin({ onJoined }: { onJoined: (me: CircleMe) => void }) {
  const members = CIRCLE_MEMBERS;

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members) counts.set(m.cityId, (counts.get(m.cityId) ?? 0) + 1);
    return [...counts.entries()]
      .map(([id, count]) => ({ city: cityById(id)!, count }))
      .filter((c) => c.city)
      .sort((a, b) => b.count - a.count);
  }, [members]);

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [company, setCompany] = useState("");
  const [cityId, setCityId] = useState("blr");
  const [mode, setMode] = useState<LocationMode>("base");
  const [interests, setInterests] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [joining, setJoining] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let best = CIRCLE_CITIES[0];
        let bestD = Infinity;
        for (const c of CIRCLE_CITIES) {
          const d = (c.lat - pos.coords.latitude) ** 2 + (c.lng - pos.coords.longitude) ** 2;
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        setCityId(best.id);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  function toggle(tag: string) {
    setInterests((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : cur.length >= 5 ? cur : [...cur, tag]));
  }

  function join() {
    if (!name.trim()) return;
    setJoining(true);
    const next: CircleMe = {
      name: name.trim(),
      headline: headline.trim(),
      company: company.trim(),
      cityId,
      mode,
      // Everyone is in the one open space; communities become a filter.
      entityIds: [OPEN_ID],
      beaconEventId: null,
      interests,
      connectedIds: [],
      requestedIds: [],
    };
    setMe(next, "open");
    markJustJoined();
    // Handed back rather than routed to: this screen is rendered *by* /open,
    // so pushing to /open is a no-op and the map would never re-read storage.
    onJoined(next);
  }

  const continents = new Set(cities.map((c) => continentOf(c.city))).size;

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "var(--sunk)" }}>
      <div className="mx-auto w-full max-w-[560px]">
        <div className="card overflow-hidden p-0">
          <InviteMap members={members} />

          <div className="-mt-10 px-6 pb-5">
            <span
              className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl"
              style={{ background: "var(--brand)", color: "#fff", boxShadow: "var(--shadow-lift)" }}
            >
              <IconGlobe size={26} />
            </span>
            <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Open network</p>
            <h1 className="mt-0.5 text-[24px] font-bold leading-tight">Everyone, on one map</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <IconPeople size={13} /> No invite needed
              </span>
              <span className="inline-flex items-center gap-1">
                <IconGlobe size={13} /> {members.length.toLocaleString()} across {cities.length} cities
              </span>
            </p>

            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl" style={{ background: "var(--line)" }}>
              {[
                { n: members.length.toLocaleString(), l: "people" },
                { n: cities.length, l: "cities" },
                { n: continents, l: "continents" },
              ].map((stat) => (
                <div key={stat.l} className="px-3 py-2.5 text-center" style={{ background: "var(--card)" }}>
                  <p className="text-[18px] font-bold leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {stat.n}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{stat.l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5 p-6">
            <label className="block">
              <span className="label">Your name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What people should call you"
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-[var(--brand)]"
              />
            </label>

            <div className="flex gap-2">
              <label className="block flex-1">
                <span className="label">What you do</span>
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Head of Product"
                  className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-[var(--brand)]"
                />
              </label>
              <label className="block flex-1">
                <span className="label">Where</span>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Northwind"
                  className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-[var(--brand)]"
                />
              </label>
            </div>

            {/* The one question that does real work out here. */}
            <div>
              <span className="label">What are you here for</span>
              <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
                Pick up to five. In a room with no introductions, this is what decides who&rsquo;s worth showing you.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {OPEN_INTERESTS.slice(0, 14).map((t) => {
                  const on = interests.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggle(t)}
                      className="tap rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold"
                      style={
                        on
                          ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
                          : { background: "var(--sunk)", color: "var(--ink-soft)" }
                      }
                      aria-pressed={on}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <IconChevronDown size={15} className="pointer-events-none absolute bottom-3 right-3 text-[var(--ink-soft)]" />
              <div className="flex items-center justify-between">
                <span className="label">Where you&rsquo;re based</span>
                <button onClick={useMyLocation} className="text-[11.5px] font-semibold" style={{ color: "var(--brand)" }}>
                  {locating ? "Finding you…" : "Use my location"}
                </button>
              </div>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="mt-1.5 w-full appearance-none rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-[var(--brand)]"
              >
                {CIRCLE_CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="label">Who can see where you are</span>
              <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
                Everyone here, whichever you pick — nobody has been vouched for by a shared institution. Start at city level; you can
                always open it up.
              </p>
              <div className="mt-2">
                <LocationModePicker value={mode} onChange={setMode} />
              </div>
            </div>

            <button onClick={join} disabled={!name.trim() || joining} className="btn btn-primary w-full">
              {joining ? "Taking you in…" : "Join the open network"}
            </button>
            <p className="-mt-2 text-center text-[11px] text-[var(--ink-soft)]">
              Prototype — nothing is saved beyond this browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
