import { getSessionUser } from "@/lib/session";
import { getProfileById } from "@/lib/profiles";
import MapView from "@/components/MapViewLoader";

export default async function Home() {
  const user = await getSessionUser();
  const row = user ? await getProfileById(user.id) : null;
  const canAct = Boolean(user?.onboarded);

  return (
    <div>
      <h1 className="text-2xl font-bold">
        {canAct ? "Nearby" : "Professionals near you, right now"}
      </h1>
      <p className="mt-1 text-[13.5px] text-[var(--ink-soft)]">
        {!user ? (
          <>
            Browse freely — <a href="/login" className="underline">sign in</a> to connect, message, or show up
            on the map yourself.
          </>
        ) : !canAct ? (
          <>
            Browse freely — <a href="/profile" className="underline">finish your profile</a> to show up on the
            map and start connecting.
          </>
        ) : row?.visibleOnMap === false ? (
          <>
            You&apos;re hidden from the map right now — <a href="/profile" className="underline">turn visibility back on</a>.
          </>
        ) : (
          <>
            People within your radius who are visible right now — <a href="/profile" className="underline">manage visibility</a>.
          </>
        )}
      </p>
      <div className="mt-5">
        <MapView
          ownLat={row?.lat ?? null}
          ownLng={row?.lng ?? null}
          ownName={user?.name ?? "You"}
          ownPhotoUrl={user?.photoUrl ?? null}
          ownVisible={row?.visibleOnMap ?? false}
          canAct={canAct}
        />
      </div>
    </div>
  );
}
