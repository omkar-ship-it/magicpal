"use client";

import { useEffect, useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import MessageThread from "./MessageThread";

type Message = { id: string; senderId: string; body: string; createdAt: string };

/**
 * A real message thread, opened inside the map instead of on its own page.
 *
 * MessageThread itself is unchanged — it still talks to /api/messages and
 * still polls. This only loads the backlog the deleted /messages/[id] route
 * used to render server-side, so a thread opens full rather than empty.
 */
export default function RealThread({
  connectionId,
  meId,
  otherName,
  otherHeadline,
  otherPhotoUrl,
}: {
  connectionId: string;
  meId: string;
  otherName: string;
  otherHeadline: string | null;
  otherPhotoUrl: string | null;
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/messages?connectionId=${connectionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMessages(d.messages ?? []);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId]);

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="avatar h-10 w-10 flex-none text-[13px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={otherPhotoUrl ?? avatarUrl(otherName)} alt="" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold leading-tight">{otherName}</p>
          {otherHeadline && <p className="truncate text-[12px] text-[var(--ink-soft)]">{otherHeadline}</p>}
        </div>
      </div>

      <div className="mt-3">
        {messages === null ? (
          <p className="text-[13px] text-[var(--ink-soft)]">Loading your conversation…</p>
        ) : (
          <MessageThread connectionId={connectionId} meId={meId} otherName={otherName} initialMessages={messages} />
        )}
      </div>
    </div>
  );
}
