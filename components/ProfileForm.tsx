"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GeoResult = { label: string; lat: number; lng: number };

type Initial = {
  name: string;
  headline: string;
  company: string;
  bio: string;
  skills: string[];
  photoUrl: string | null;
  locationLabel: string;
  lat: number | null;
  lng: number | null;
  visibleOnMap: boolean;
  linkedinUrl: string;
  instagramUrl: string;
  websiteUrl: string;
};

const MAX_SKILLS = 8;

export default function ProfileForm({ initial, wasOnboarded }: { initial: Initial; wasOnboarded: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [headline, setHeadline] = useState(initial.headline);
  const [company, setCompany] = useState(initial.company);
  const [bio, setBio] = useState(initial.bio);
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [skillInput, setSkillInput] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.photoUrl);
  const [visibleOnMap, setVisibleOnMap] = useState(initial.visibleOnMap);
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl);
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl);
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl);

  const [locationLabel, setLocationLabel] = useState(initial.locationLabel);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial.lat != null && initial.lng != null ? { lat: initial.lat, lng: initial.lng } : null
  );
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoBusy, setGeoBusy] = useState(false);
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (geoTimer.current) clearTimeout(geoTimer.current);
    if (locationLabel.trim().length < 2 || (coords && locationLabel === initial.locationLabel)) {
      Promise.resolve().then(() => setGeoResults([]));
      return;
    }
    geoTimer.current = setTimeout(async () => {
      setGeoBusy(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationLabel)}`);
        const data = await res.json();
        setGeoResults(data.results ?? []);
      } finally {
        setGeoBusy(false);
      }
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationLabel]);

  function pickLocation(r: GeoResult) {
    setLocationLabel(r.label);
    setCoords({ lat: r.lat, lng: r.lng });
    setGeoResults([]);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || skills.includes(s) || skills.length >= MAX_SKILLS) {
      setSkillInput("");
      return;
    }
    setSkills([...skills, s]);
    setSkillInput("");
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't upload that photo.");
      setPhotoUrl(data.photoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    try {
      await fetch("/api/profile/photo", { method: "DELETE" });
      setPhotoUrl(null);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          headline,
          company,
          bio,
          skills,
          locationLabel: coords ? locationLabel : "",
          lat: coords?.lat,
          lng: coords?.lng,
          visibleOnMap,
          linkedinUrl,
          instagramUrl,
          websiteUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save that.");
      if (!wasOnboarded) {
        router.push("/");
        router.refresh();
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mt-6 flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <span
          className="avatar h-16 w-16 text-xl"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" />
          ) : (
            (name || "?").slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="flex flex-col gap-1.5">
          <label className="btn btn-ghost btn-sm w-fit cursor-pointer">
            {photoBusy ? "Working…" : photoUrl ? "Change photo" : "Add photo"}
            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} disabled={photoBusy} />
          </label>
          {photoUrl && (
            <button type="button" onClick={removePhoto} disabled={photoBusy} className="text-left text-[12px] text-[var(--ink-soft)] hover:text-[var(--warn)]">
              Remove photo
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </div>
        <div>
          <label className="label">Headline</label>
          <input
            className="input"
            placeholder="Product Manager at Acme"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            required
            maxLength={120}
          />
        </div>
      </div>

      <div>
        <label className="label">Company (optional)</label>
        <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
      </div>

      <div>
        <label className="label">Bio (optional)</label>
        <textarea
          className="input"
          rows={3}
          placeholder="What you're working on, what you're looking for."
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 600))}
        />
      </div>

      <div>
        <label className="label">Skills ({skills.length}/{MAX_SKILLS})</label>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span key={s} className="skill-tag">
              {s}
              <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="text-[var(--ink-soft)]">
                ×
              </button>
            </span>
          ))}
        </div>
        {skills.length < MAX_SKILLS && (
          <input
            className="input mt-2"
            placeholder="Type a skill and press Enter"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addSkill();
              }
            }}
          />
        )}
      </div>

      <div>
        <label className="label">Links (optional)</label>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[var(--ink-soft)]">in</span>
            <input
              className="input pl-10"
              placeholder="linkedin.com/in/you"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
            </svg>
            <input
              className="input pl-10"
              placeholder="instagram.com/you"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
            </svg>
            <input
              className="input pl-10"
              placeholder="yoursite.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              maxLength={300}
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <label className="label">Where are you based?</label>
        <input
          className="input"
          placeholder="Search a neighbourhood or city"
          value={locationLabel}
          onChange={(e) => {
            setLocationLabel(e.target.value);
            setCoords(null);
          }}
        />
        {geoBusy && <p className="mt-1 text-[12px] text-[var(--ink-soft)]">Searching…</p>}
        {geoResults.length > 0 && (
          <div className="card absolute z-10 mt-1 w-full overflow-hidden p-1">
            {geoResults.map((r) => (
              <button
                key={`${r.lat},${r.lng}`}
                type="button"
                onClick={() => pickLocation(r)}
                className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-[var(--sunk)]"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
        {coords && !geoResults.length && (
          <p className="mt-1.5 text-[12px] text-[var(--good)]">Pinned — this is what shows on the map, never your exact address.</p>
        )}
      </div>

      <div>
        <label className="chip-toggle w-fit" data-on={visibleOnMap}>
          <input
            type="checkbox"
            className="hidden"
            checked={visibleOnMap}
            onChange={(e) => setVisibleOnMap(e.target.checked)}
          />
          {visibleOnMap ? "Visible on the map" : "Hidden from the map"}
        </label>
        <p className="mt-1.5 text-[12px] text-[var(--ink-soft)]">
          This is the real switch for whether you show up on the public map at all.
        </p>
      </div>

      {error && <p className="text-[13px] font-medium text-[var(--warn)]">{error}</p>}
      {saved && <p className="text-[13px] font-medium text-[var(--good)]">Saved.</p>}

      <button type="submit" disabled={busy} className="btn btn-primary">
        {busy ? "Saving…" : wasOnboarded ? "Save changes" : "Finish & see the map"}
      </button>
    </form>
  );
}
