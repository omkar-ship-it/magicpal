"use client";

import { useEffect } from "react";

/**
 * Sends an old route to its new home on the map.
 *
 * Profile, requests, connections and message threads were separate pages
 * behind a header nav; they're floating pages on the map now, addressed by
 * hash. A fragment never reaches the server, so a server redirect can't carry
 * one — this does it client-side, and replaces the entry so Back doesn't
 * bounce you straight back out.
 */
export default function HashRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <div className="fixed inset-0 grid place-items-center text-[13px] text-[var(--ink-soft)]">
      Taking you to the map…
    </div>
  );
}
