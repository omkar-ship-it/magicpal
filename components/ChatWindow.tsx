"use client";

import { useEffect, useRef, useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import { BOOKING_SLOTS, MEETING_KINDS, MOCK_THREADS, type MeetingKind, type MockMessage } from "@/lib/chatData";

/**
 * A 1:1 chat, rendered as one more window in the dock rather than its own
 * floating box — same minimise, expand, full-screen and close as a feed or
 * an event page. Mocked (lib/chatData.ts): messages you send stay in memory
 * for the session.
 */
export default function ChatWindow({
  name,
  photoUrl,
  headline,
  wide,
  initialMessages,
}: {
  name: string;
  photoUrl: string | null;
  headline: string | null;
  wide: boolean;
  /** Supplied by callers whose people aren't in MOCK_THREADS — the members-only map seeds its own openers. */
  initialMessages?: MockMessage[];
}) {
  // Keyed by person in MapView, so switching chat remounts this and the
  // thread/booking state resets without an effect syncing it.
  const [messages, setMessages] = useState<MockMessage[]>(() => initialMessages ?? MOCK_THREADS[name] ?? []);
  const [draft, setDraft] = useState("");
  const [booking, setBooking] = useState(false);
  const [kind, setKind] = useState<MeetingKind>("Coffee");
  const [picked, setPicked] = useState<{ day: string; date: string; time: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function send() {
    const body = draft.trim();
    if (!body) return;
    setMessages((m) => [...m, { id: `me-${Date.now()}`, mine: true, body, timeLabel: "now" }]);
    setDraft("");
  }

  function confirmBooking() {
    if (!picked) return;
    setMessages((m) => [
      ...m,
      {
        id: `bk-${Date.now()}`,
        mine: true,
        body: `📅 ${kind} booked — ${picked.day} ${picked.date} at ${picked.time}. Invite sent.`,
        timeLabel: "now",
      },
    ]);
    setBooking(false);
    setPicked(null);
  }

  const inner = wide ? "mx-auto w-full max-w-2xl" : "";

  return (
    <div className="flex h-full min-h-[460px] flex-col">
      <div className={`flex flex-none items-center gap-2 border-b border-[var(--line)] pb-3 ${inner}`}>
        <span className="avatar h-9 w-9 flex-none text-[12px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl ?? avatarUrl(name)} alt="" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold leading-tight">{name}</p>
          {headline && <p className="truncate text-[11.5px] text-[var(--ink-soft)]">{headline}</p>}
        </div>
      </div>

      <div ref={scrollRef} className={`flex-1 overflow-y-auto py-3 ${inner}`}>
        <div className="flex flex-col gap-2">
          {messages.map((m) => (
            <div key={m.id} className={m.mine ? "self-end" : "self-start"} style={{ maxWidth: "85%" }}>
              <div
                className="rounded-2xl px-3 py-2 text-[12.5px] leading-5"
                style={
                  m.mine
                    ? { background: "var(--brand)", color: "#fff", borderBottomRightRadius: 6 }
                    : { background: "var(--sunk)", color: "var(--ink)", borderBottomLeftRadius: 6 }
                }
              >
                {m.body}
              </div>
              <p className={`mt-0.5 text-[10.5px] text-[var(--ink-soft)] ${m.mine ? "text-right" : ""}`}>{m.timeLabel}</p>
            </div>
          ))}
        </div>
      </div>

      {booking ? (
        <div className={`flex-none border-t border-[var(--line)] pt-3 ${inner}`}>
          <p className="label">Book a time with {name.split(" ")[0]}</p>
          <div className="flex flex-wrap gap-1.5">
            {MEETING_KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className="pill"
                style={
                  kind === k
                    ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)", border: "1px solid var(--brand)" }
                    : { background: "var(--sunk)", color: "var(--ink-soft)", border: "1px solid transparent" }
                }
              >
                {k}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            {BOOKING_SLOTS.map((slot) => (
              <div key={slot.id} className="flex items-center gap-2">
                <span className="w-[72px] flex-none text-[12px] font-semibold text-[var(--ink-soft)]">
                  {slot.day} {slot.date}
                </span>
                <div className="flex flex-wrap gap-1">
                  {slot.times.map((t) => {
                    const on = picked?.date === slot.date && picked?.time === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setPicked({ day: slot.day, date: slot.date, time: t })}
                        className="rounded-lg border px-2 py-1 text-[12px] font-semibold transition-colors"
                        style={
                          on
                            ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 12%, var(--card))", color: "var(--brand)" }
                            : { borderColor: "var(--line)", background: "var(--card)", color: "var(--ink)" }
                        }
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setBooking(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={confirmBooking} disabled={!picked} className="btn btn-primary btn-sm flex-1">
              {picked ? `Confirm ${kind.toLowerCase()} — ${picked.day} ${picked.time}` : "Pick a slot"}
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex-none border-t border-[var(--line)] pt-3 ${inner}`}>
          <div className="flex items-end gap-2">
            <textarea
              className="input text-[12.5px]"
              rows={wide ? 3 : 2}
              placeholder={`Message ${name.split(" ")[0]}…`}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 600))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button onClick={send} disabled={!draft.trim()} className="btn btn-primary btn-sm flex-none">
              Send
            </button>
          </div>
          <button onClick={() => setBooking(true)} className="btn btn-ghost btn-sm mt-2 w-full">
            📅 Book a time to connect
          </button>
        </div>
      )}
    </div>
  );
}
