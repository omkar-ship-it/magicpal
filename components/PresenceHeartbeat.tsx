"use client";

import { useEffect } from "react";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/rules";

/**
 * Invisible — just keeps `users.lastActiveAt` fresh while any authenticated
 * page is open, so the "active nearby" pulse reflects real usage rather than
 * only whoever happens to be staring at the map right now.
 */
export default function PresenceHeartbeat() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
