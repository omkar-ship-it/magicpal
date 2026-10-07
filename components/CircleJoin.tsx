"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { avatarUrl } from "@/lib/avatar";
import { entityById } from "@/lib/networks";
import {
  CIRCLE_CITIES,
  qualifiedName,
  continentOf,
  LOCATION_MODES,
  cityById,
  membersOf,
  type CircleInvite,
  type LocationMode,
} from "@/lib/circleData";
import { setMe } from "@/lib/circleMe";

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
      headline: "",
      cityId,
      mode,
      entityIds: [invite.entityId],
      beaconEventId: null,
    });
    router.push("/circle");
  }

  const continents = new Set(cities.map((c) => continentOf(c.city))).size;

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "var(--sunk)" }}>
      <div className="mx-auto w-full max-w-[560px]">
        <div className="card overflow-hidden p-0">
          {/* Who's inviting you, and to what. */}
          <div className="px-6 pb-5 pt-6" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--brand) 12%, var(--card)), var(--card))" }}>
            <span className="text-[34px] leading-none">{entity?.emoji ?? "🎓"}</span>
            <h1 className="mt-2 text-[22px] font-bold leading-tight">{entity?.name ?? "A private community"}</h1>
            {parentTrail && <p className="text-[12.5px] font-semibold text-[var(--ink-soft)]">{parentTrail}</p>}
            <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
              {entity?.label} · members only · {members.length} on the map
            </p>

            <div className="mt-4 flex items-start gap-2.5 rounded-2xl p-3" style={{ background: "var(--card)" }}>
              <span className="avatar h-9 w-9 flex-none text-[11px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl(invite.adminName)} alt="" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold leading-tight">
                  {invite.adminName} <span className="font-normal text-[var(--ink-soft)]">invited you</span>
                </p>
                <p className="text-[11.5px] text-[var(--ink-soft)]">{invite.adminRole}</p>
                <p className="mt-1.5 text-[13px] leading-5">{invite.note}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="pill" style={{ background: "var(--card)", color: "var(--ink-soft)" }}>
                {cities.length} cities
              </span>
              <span className="pill" style={{ background: "var(--card)", color: "var(--ink-soft)" }}>
                {continents} continents
              </span>
              {cities.slice(0, 3).map((c) => (
                <span key={c.city.id} className="pill" style={{ background: "var(--card)", color: "var(--ink-soft)" }}>
                  {c.city.name} {c.count}
                </span>
              ))}
            </div>
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

            <div>
              <div className="flex items-center justify-between">
                <span className="label">Where you&rsquo;re based</span>
                <button onClick={useMyLocation} className="text-[11.5px] font-semibold" style={{ color: "var(--brand)" }}>
                  {locating ? "Finding you…" : "Use my location"}
                </button>
              </div>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-[var(--brand)]"
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
              <div className="mt-2 flex flex-col gap-1.5">
                {LOCATION_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-colors"
                    style={
                      mode === m.id
                        ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 7%, var(--card))" }
                        : { borderColor: "var(--line)" }
                    }
                  >
                    <span className="text-[17px] leading-none">{m.emoji}</span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight">{m.label}</span>
                      <span className="block text-[11.5px] leading-4 text-[var(--ink-soft)]">{m.detail}</span>
                    </span>
                  </button>
                ))}
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
