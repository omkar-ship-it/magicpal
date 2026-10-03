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
}: {
  isSignedIn: boolean;
  canAct: boolean;
  name: string;
  photoUrl: string | null;
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
        className="avatar h-11 w-11 text-[14px] shadow-lift border-2"
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
      </button>

      {open && (
        <div className="card absolute right-0 top-[52px] w-52 overflow-hidden p-1.5 text-[13.5px]">
          {!canAct && (
            <Link href="/profile" className="block rounded-lg px-3 py-2 font-semibold" style={{ color: "var(--brand-deep)" }}>
              Finish your profile
            </Link>
          )}
          <Link href="/requests" className="block rounded-lg px-3 py-2 hover:bg-[var(--sunk)]">
            Requests
          </Link>
          <Link href="/connections" className="block rounded-lg px-3 py-2 hover:bg-[var(--sunk)]">
            Connections
          </Link>
          <Link href="/profile" className="block rounded-lg px-3 py-2 hover:bg-[var(--sunk)]">
            Profile
          </Link>
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
