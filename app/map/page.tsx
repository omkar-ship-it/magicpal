import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getProfileById } from "@/lib/profiles";
import MapView from "@/components/MapViewLoader";

export default async function MapPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/profile");

  const row = await getProfileById(user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">Nearby</h1>
      <p className="mt-1 text-[13.5px] text-[var(--ink-soft)]">
        {row?.visibleOnMap === false
          ? "You're hidden from the map right now — "
          : "People within your radius who are visible right now — "}
        <a href="/profile" className="underline">
          {row?.visibleOnMap === false ? "turn visibility back on" : "manage visibility"}
        </a>
        .
      </p>
      <div className="mt-5">
        <MapView
          ownLat={row?.lat ?? null}
          ownLng={row?.lng ?? null}
          ownName={user.name ?? "You"}
          ownPhotoUrl={user.photoUrl}
          ownVisible={row?.visibleOnMap ?? false}
        />
      </div>
    </div>
  );
}
