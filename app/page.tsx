import { getSessionUser } from "@/lib/session";
import { getProfileById } from "@/lib/profiles";
import MapView from "@/components/MapViewLoader";

/**
 * This is the app. Not a homepage with a map on it — the map, full-bleed,
 * with everything else (search, filters, account) floating on top of it,
 * the way Google Maps' own web app works. See MapView for the actual shell.
 */
export default async function Home() {
  const user = await getSessionUser();
  const row = user ? await getProfileById(user.id) : null;
  const canAct = Boolean(user?.onboarded);

  return (
    <MapView
      ownId={user?.id ?? null}
      ownLat={row?.lat ?? null}
      ownLng={row?.lng ?? null}
      ownName={user?.name ?? "You"}
      ownPhotoUrl={user?.photoUrl ?? null}
      ownVisible={row?.visibleOnMap ?? false}
      // The whole saved profile, so the You page opens in-world with no extra
      // fetch — there's no /profile route to send people to any more.
      ownProfile={
        user
          ? {
              name: row?.name ?? user.name ?? "",
              headline: row?.headline ?? "",
              company: row?.company ?? "",
              bio: row?.bio ?? "",
              skills: row?.skills ?? [],
              photoUrl: row?.photoUrl ?? null,
              locationLabel: row?.locationLabel ?? "",
              lat: row?.lat ?? null,
              lng: row?.lng ?? null,
              visibleOnMap: row?.visibleOnMap ?? true,
              linkedinUrl: row?.linkedinUrl ?? "",
              instagramUrl: row?.instagramUrl ?? "",
              websiteUrl: row?.websiteUrl ?? "",
            }
          : null
      }
      canAct={canAct}
      isSignedIn={Boolean(user)}
    />
  );
}
