import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listAcceptedConnections } from "@/lib/connections";

export default async function ConnectionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/profile");

  const connections = await listAcceptedConnections(user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">Your connections</h1>
      <p className="mt-1 text-[13.5px] text-[var(--ink-soft)]">People you&apos;ve both said yes to.</p>

      <div className="mt-5 flex flex-col gap-3">
        {connections.length === 0 && (
          <p className="card p-5 text-[13px] text-[var(--ink-soft)]">
            No connections yet —{" "}
            <Link href="/" className="underline">
              find people nearby
            </Link>{" "}
            to get started.
          </p>
        )}
        {connections.map((c) => (
          <Link
            key={c.id}
            href={`/messages/${c.id}`}
            className="card flex items-center gap-3 p-4 transition-colors hover:border-[var(--brand)]"
          >
            <span
              className="avatar h-11 w-11 text-[13px]"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
            >
              {c.otherPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.otherPhotoUrl} alt="" />
              ) : (
                (c.otherName ?? "?").slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="flex-1">
              <p className="text-[13.5px] font-semibold leading-tight">{c.otherName ?? "Someone"}</p>
              {c.otherHeadline && <p className="text-[12px] text-[var(--ink-soft)]">{c.otherHeadline}</p>}
            </div>
            <span className="text-[12px] font-medium text-[var(--brand-deep)]">Message →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
