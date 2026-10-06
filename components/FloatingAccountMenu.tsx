"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * The map screen's only nav chrome — a single floating circle, Google-Maps-
 * style, instead of a permanent header bar competing with the map for space.
 */
export default function FloatingAccountMenu({
  isSignedIn,
  canAct,
  name,
  photoUrl,
  attention,
  onOpenYou,
  onOpenRequests,
  onOpenChats,
}: {
  isSignedIn: boolean;
  canAct: boolean;
  name: string;
  photoUrl: string | null;
  /** Open requests, badged on the avatar so the inbox is visible from anywhere. */
  attention: number;
  /**
   * Every item opens a floating page on the map. None of these used to be —
   * they were links out to a separate header-nav website, which is why
   * finishing your profile meant losing your place.
   */
  onOpenYou: () => void;
  onOpenRequests: () => void;
  onOpenChats: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!isSignedIn) {
    return (
      <Link href="/login" className="btn btn-primary" style={{ boxShadow: "var(--shadow-lift)" }}>
        Sign in
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="avatar relative h-11 w-11 border-2 text-[14px] shadow-lift"
        style={{
          background: "linear-gradient(135deg, var(--brand), var(--brand-deep))",
          borderColor: "var(--card)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
        {attention > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ background: "var(--warn)", boxShadow: "0 0 0 2px var(--card)" }}
          >
            {attention}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 top-[52px] w-56 overflow-hidden p-1.5 text-[13.5px]">
          {!canAct && (
            <button
              onClick={() => {
                setOpen(false);
                onOpenYou();
              }}
              className="block w-full rounded-lg px-3 py-2 text-left font-semibold"
              style={{ color: "var(--brand-deep)" }}
            >
              Finish your profile
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              onOpenRequests();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[var(--sunk)]"
          >
            Requests
            {attention > 0 && (
              <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: "var(--warn)" }}>
                {attention}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onOpenChats();
            }}
            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--sunk)]"
          >
            Connections &amp; chats
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onOpenYou();
            }}
            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--sunk)]"
          >
            You
          </button>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="block w-full rounded-lg px-3 py-2 text-left text-[var(--ink-soft)] hover:bg-[var(--sunk)]">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
