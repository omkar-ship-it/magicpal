"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { entityById } from "@/lib/networks";
import {
  CIRCLE_CITIES,
  qualifiedName,
  continentOf,
  cityById,
  membersOf,
  type CircleInvite,
  type LocationMode,
} from "@/lib/circleData";
import { setMe } from "@/lib/circleMe";
import LocationModePicker from "./LocationModePicker";
import InviteMap from "./InviteMap";
import { markJustJoined } from "./CircleWelcome";
import { IconChevronDown, IconGlobe, IconLock, IconPin } from "./Icons";

/**
 * The whole of onboarding, on one screen.
 *
 * An admin shares one link. Opening it tells you who invited you and what
 * you'd be joining; giving your name puts you in. There's no account to
 * create first, no public profile, no approval queue — the invite *is* the
 * verification, which is the thing a closed alumni network has and an open
 * map doesn't.
 */
export default function CircleJoin({ invite }: { invite: CircleInvite }) {
  const router = useRouter();
  const entity = entityById(invite.entityId);
  const members = useMemo(() => membersOf(invite.entityId), [invite.entityId]);
  // "Class of 2019" means nothing on its own — say whose class it is.
  const parentTrail = qualifiedName(invite.entityId).split(" · ").slice(0, -1).join(" · ");

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
  const [cityId, setCityId] = useState(cities[0]?.city.id ?? "blr");
  const [mode, setMode] = useState<LocationMode>("base");
  const [locating, setLocating] = useState(false);
  const [joining, setJoining] = useState(false);

  /** Nearest city in the list to a real fix — the map works in cities, not coordinates. */
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

  function join() {
    if (!name.trim()) return;
    setJoining(true);
    setMe({
      name: name.trim(),
      headline: headline.trim(),
      company: company.trim(),
      cityId,
      mode,
      entityIds: [invite.entityId],
      beaconEventId: null,
    });
    markJustJoined();
    router.push("/circle");
  }

  const continents = new Set(cities.map((c) => continentOf(c.city))).size;

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "var(--sunk)" }}>
      <div className="mx-auto w-full max-w-[560px]">
        <div className="card overflow-hidden p-0">
          {/* The promise, shown rather than described. */}
          <InviteMap members={members} />

          <div className="-mt-10 px-6 pb-5">
            <span
              className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl text-[26px]"
              style={{ background: "var(--card)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lift)" }}
            >
              {entity?.emoji ?? "🎓"}
            </span>
            {parentTrail && <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{parentTrail}</p>}
            <h1 className="mt-0.5 text-[24px] font-bold leading-tight">{entity?.name ?? "A private community"}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <IconLock size={13} /> Members only
              </span>
              <span className="inline-flex items-center gap-1">
                <IconGlobe size={13} /> {members.length} across {cities.length} cities
              </span>
            </p>

            <div className="mt-4 flex items-start gap-2.5 rounded-2xl p-3" style={{ background: "var(--sunk)" }}>
              <Avatar name={invite.adminName} size={36} />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold leading-tight">
                  {invite.adminName} <span className="font-normal text-[var(--ink-soft)]">invited you</span>
                </p>
                <p className="text-[11.5px] text-[var(--ink-soft)]">{invite.adminRole}</p>
                <p className="mt-1.5 text-[13px] leading-5">{invite.note}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-2xl" style={{ background: "var(--line)" }}>
              {[
                { n: members.length, l: "members" },
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
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--ink-soft)]">
              <IconPin size={12} />
              Biggest: {cities.slice(0, 3).map((c) => `${c.city.name} ${c.count}`).join(" · ")}
            </p>
          </div>

          {/* Everything it takes to be in. */}
          <div className="flex flex-col gap-5 p-6">
            <label className="block">
              <span className="label">Your name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && join()}
                placeholder="How your batch knows you"
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-[var(--brand)]"
              />
            </label>

            {/* Optional, and deliberately so — the invite's whole promise is
                that your name is enough. But a pin with a role on it is worth
                opening, and a pin with only a name isn't. */}
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
                  onKeyDown={(e) => e.key === "Enter" && join()}
                  placeholder="Northwind"
                  className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-[var(--brand)]"
                />
              </label>
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
                style={{ backgroundImage: "none" }}
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
              <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">Only members of this community, whichever you pick. Change it any time.</p>
              <div className="mt-2">
                <LocationModePicker value={mode} onChange={setMode} />
              </div>
            </div>

            <button onClick={join} disabled={!name.trim() || joining} className="btn btn-primary w-full">
              {joining ? "Taking you in…" : `Join ${entity?.name ?? "the community"}`}
            </button>
            <p className="-mt-2 text-center text-[11px] text-[var(--ink-soft)]">
              Prototype — nothing is saved beyond this browser, and there is no public network here to be found on.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
