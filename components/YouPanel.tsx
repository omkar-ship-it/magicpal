"use client";

import ProfileForm from "./ProfileForm";
import AffiliationsEditor from "./AffiliationsEditor";

export type OwnProfile = {
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

/**
 * You, as a floating page on the map rather than a separate website page.
 *
 * This is the last thing that used to live behind a header nav — setting up
 * your profile meant leaving the map, and coming back meant losing whatever
 * you'd been looking at. Same form, same POST /api/profile, no round trip out
 * of the world.
 */
export default function YouPanel({ profile, onboarded }: { profile: OwnProfile; onboarded: boolean }) {
  return (
    <div>
      <span className="text-[26px] leading-none">🙋</span>
      <h2 className="mt-1.5 text-[19px] font-bold leading-tight">{onboarded ? "You" : "Set up your profile"}</h2>
      <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
        {onboarded
          ? "What people see before they decide to connect with you."
          : "A few lines about you, and where to put you on the map."}
      </p>

      <ProfileForm initial={profile} wasOnboarded={onboarded} />

      {onboarded && <AffiliationsEditor />}
    </div>
  );
}
