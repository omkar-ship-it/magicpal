"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: string; senderId: string; body: string; createdAt: string };

const POLL_MS = 4000;

export default function MessageThread({
  connectionId,
  meId,
  initialMessages,
  otherName,
}: {
  connectionId: string;
  meId: string;
  initialMessages: Message[];
  otherName: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`/api/messages?connectionId=${connectionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [connectionId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, body }),
      });
      const data = await res.json();
      if (res.ok && data.message) setMessages((m) => [...m, data.message]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex h-[600px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-center text-[13px] text-[var(--ink-soft)]">
            Say hello to {otherName.split(" ")[0]} — this is the start of your conversation.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-5"
                style={
                  mine
                    ? { background: "linear-gradient(120deg, var(--brand), var(--brand-deep))", color: "#fff" }
                    : { background: "var(--sunk)", color: "var(--ink)" }
                }
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-[var(--line)] p-3">
        <input
          className="input"
          placeholder={`Message ${otherName.split(" ")[0]}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" disabled={sending || !draft.trim()} className="btn btn-primary btn-sm">
          Send
        </button>
      </form>
    </div>
  );
}
