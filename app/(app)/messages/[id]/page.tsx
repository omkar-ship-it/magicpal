import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { assertParticipant, listMessages, markRead } from "@/lib/messages";
import { getProfileById } from "@/lib/profiles";
import MessageThread from "@/components/MessageThread";

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/profile");

  const { id } = await params;
  const connection = await assertParticipant(id, user.id);
  if (!connection) redirect("/connections");

  const otherId = connection.userAId === user.id ? connection.userBId : connection.userAId;
  const other = await getProfileById(otherId);

  await markRead(id, user.id);
  const rows = await listMessages(id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/connections" className="text-[12.5px] text-[var(--ink-soft)] hover:text-[var(--ink)]">
        ← Connections
      </Link>
      <div className="mt-2 mb-5 flex items-center gap-3">
        <span
          className="avatar h-10 w-10 text-[13px]"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
        >
          {other?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.photoUrl} alt="" />
          ) : (
            (other?.name ?? "?").slice(0, 1).toUpperCase()
          )}
        </span>
        <div>
          <p className="text-[15px] font-semibold leading-tight">{other?.name ?? "Someone"}</p>
          {other?.headline && <p className="text-[12.5px] text-[var(--ink-soft)]">{other.headline}</p>}
        </div>
      </div>

      <MessageThread
        connectionId={id}
        meId={user.id}
        otherName={other?.name ?? "them"}
        initialMessages={rows.map((r) => ({
          id: r.id,
          senderId: r.senderId,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
