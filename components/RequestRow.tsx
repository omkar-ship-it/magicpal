"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RequestRow({
  id,
  name,
  headline,
  photoUrl,
}: {
  id: string;
  name: string | null;
  headline: string | null;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  async function respond(accept: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/connections/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (res.ok) {
        setDone(accept ? "accepted" : "declined");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex items-center gap-3 p-4">
      <span
        className="avatar h-11 w-11 text-[13px]"
        style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" />
        ) : (
          (name ?? "?").slice(0, 1).toUpperCase()
        )}
      </span>
      <div className="flex-1">
        <p className="text-[13.5px] font-semibold leading-tight">{name ?? "Someone"}</p>
        {headline && <p className="text-[12px] text-[var(--ink-soft)]">{headline}</p>}
      </div>
      {done ? (
        <span className="pill" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
          {done === "accepted" ? "Accepted" : "Declined"}
        </span>
      ) : (
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => respond(false)} className="btn btn-ghost btn-sm">
            Decline
          </button>
          <button disabled={busy} onClick={() => respond(true)} className="btn btn-primary btn-sm">
            Accept
          </button>
        </div>
      )}
    </div>
  );
}
