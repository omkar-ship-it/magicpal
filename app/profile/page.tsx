import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getProfileById } from "@/lib/profiles";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const row = await getProfileById(user.id);

  return (
    <div className="mx-auto max-w-xl pb-16">
      <h1 className="text-2xl font-bold">{user.onboarded ? "Your profile" : "Set up your profile"}</h1>
      <p className="mt-1.5 text-[13.5px] text-[var(--ink-soft)]">
        {user.onboarded
          ? "Keep this current — it's what people see before they connect with you."
          : "A few lines about you, and where to find you on the map."}
      </p>

      <ProfileForm
        initial={{
          name: row?.name ?? "",
          headline: row?.headline ?? "",
          company: row?.company ?? "",
          bio: row?.bio ?? "",
          skills: row?.skills ?? [],
          photoUrl: row?.photoUrl ?? null,
          locationLabel: row?.locationLabel ?? "",
          lat: row?.lat ?? null,
          lng: row?.lng ?? null,
          visibleOnMap: row?.visibleOnMap ?? true,
        }}
        wasOnboarded={user.onboarded}
      />
    </div>
  );
}
