import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listIncomingRequests, listOutgoingRequests } from "@/lib/connections";
import RequestRow from "@/components/RequestRow";

export default async function RequestsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/profile");

  const [incoming, outgoing] = await Promise.all([
    listIncomingRequests(user.id),
    listOutgoingRequests(user.id),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-bold">Requests</h1>
        <p className="mt-1 text-[13.5px] text-[var(--ink-soft)]">People who want to connect with you.</p>
        <div className="mt-5 flex flex-col gap-3">
          {incoming.length === 0 && (
            <p className="card p-5 text-[13px] text-[var(--ink-soft)]">Nothing waiting on you right now.</p>
          )}
          {incoming.map((r) => (
            <RequestRow key={r.id} id={r.id} name={r.otherName} headline={r.otherHeadline} photoUrl={r.otherPhotoUrl} requestNote={r.requestNote} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">Sent</h2>
        <p className="mt-1 text-[13.5px] text-[var(--ink-soft)]">Still waiting on a reply.</p>
        <div className="mt-5 flex flex-col gap-3">
          {outgoing.length === 0 && (
            <p className="card p-5 text-[13px] text-[var(--ink-soft)]">You haven&apos;t sent any requests yet.</p>
          )}
          {outgoing.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 p-4">
              <span
                className="avatar h-11 w-11 text-[13px]"
                style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
              >
                {r.otherPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.otherPhotoUrl} alt="" />
                ) : (
                  (r.otherName ?? "?").slice(0, 1).toUpperCase()
                )}
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold leading-tight">{r.otherName ?? "Someone"}</p>
                {r.otherHeadline && <p className="text-[12px] text-[var(--ink-soft)]">{r.otherHeadline}</p>}
              </div>
              <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                Pending
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
