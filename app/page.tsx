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
      ownLat={row?.lat ?? null}
      ownLng={row?.lng ?? null}
      ownName={user?.name ?? "You"}
      ownPhotoUrl={user?.photoUrl ?? null}
      ownVisible={row?.visibleOnMap ?? false}
      canAct={canAct}
      isSignedIn={Boolean(user)}
    />
  );
}
