"use client";

import { useMemo, useState } from "react";
import MapGL, { Marker, NavigationControl } from "react-map-gl/mapbox";
import Avatar from "./Avatar";
import {
  ATTENDEES,
  EVENT,
  FEED,
  TOPICS,
  YOU,
  ZONE_LABEL,
  matchesFor,
  type Attendee,
  type TopicId,
} from "@/lib/eventRoom";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

/**
 * Fifty people in one building, as something you can actually work.
 *
 * Built to be sent to a community organiser as a link, which decides most
 * of what follows: no sign-in, no empty states, and every surface already
 * full of a plausible room. An organiser clicking through a demo should
 * never meet the sentence "no results yet".
 *
 * The map is the argument. A badge wall and a printed attendee list both
 * answer "who is here"; neither answers "who should I talk to", which is
 * the only question anybody actually has at an event. So every pin says
 * what that person is after, the filters cut the room by what people need
 * and what they give, and the matcher names four — with its reasons shown,
 * because a recommendation you cannot check is one nobody acts on.
 */
export default function EventRoom() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [ask, setAsk] = useState<TopicId | null>(null);
  const [offer, setOffer] = useState<TopicId | null>(null);
  const [hereOnly, setHereOnly] = useState(false);
  const [panel, setPanel] = useState<"matches" | "feed" | "chat">("matches");
  const [chatWith, setChatWith] = useState<Attendee | null>(null);
  const [sent, setSent] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState("");
  /**
   * Read once, at mount. The framing below depends on whether the panel
   * sits beside the map or under it, and that is a layout fact the map
   * needs before its first paint rather than after a resize.
   */
  const [wide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 640);

  const shown = useMemo(
    () =>
      ATTENDEES.filter(
        (a) => (!ask || a.askTopic === ask) && (!offer || a.offerTopic === offer) && (!hereOnly || a.here)
      ),
    [ask, offer, hereOnly]
  );
  const shownIds = useMemo(() => new Set(shown.map((a) => a.id)), [shown]);
  const matches = useMemo(() => matchesFor(YOU, shown), [shown]);
  const open = openId ? ATTENDEES.find((a) => a.id === openId) ?? null : null;
  const hereCount = ATTENDEES.filter((a) => a.here).length;

  function message(a: Attendee) {
    setChatWith(a);
    setPanel("chat");
    setOpenId(null);
  }

  function send() {
    if (!chatWith || !draft.trim()) return;
    setSent((s) => ({ ...s, [chatWith.id]: [...(s[chatWith.id] ?? []), draft.trim()] }));
    setDraft("");
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "var(--sunk)" }}>
      <MapGL
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        /**
         * Framed around the chrome, not the viewport.
         *
         * The header and the side panel cover a third of the screen, and
         * Mapbox's idea of "centre" is the centre of the canvas — so
         * without padding a fifth of the room sits underneath them, which
         * on a page whose whole argument is "look how many people" is the
         * worst possible place to hide people.
         */
        initialViewState={{
          latitude: EVENT.lat,
          longitude: EVENT.lng,
          zoom: 17.35,
          padding: { top: 132, right: wide ? 372 : 16, bottom: wide ? 48 : 330, left: 16 },
        }}
        /* A venue is one building. Letting somebody pan to Mumbai from a
           page about this room is a way to get lost in a demo. */
        minZoom={16.5}
        maxZoom={20}
        style={{ position: "absolute", inset: 0 }}
        reuseMaps
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {ATTENDEES.map((a) => {
          const dimmed = !shownIds.has(a.id);
          const lit = matches.some((m) => m.a.id === a.id);
          return (
            /* Lifted while hovered. Markers are siblings in source order,
               so without this the card opens underneath whoever happens to
               be drawn after — and in a crowd that is most of them. */
            <Marker
              key={a.id}
              latitude={a.lat}
              longitude={a.lng}
              anchor="center"
              style={{ zIndex: hoverId === a.id ? 50 : lit ? 2 : 1 }}
            >
              <span
                className="relative block"
                style={{ opacity: dimmed ? 0.18 : 1, transition: "opacity 180ms ease" }}
                onMouseEnter={() => !dimmed && setHoverId(a.id)}
                onMouseLeave={() => setHoverId((h) => (h === a.id ? null : h))}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (dimmed) return;
                    // The card has done its job once the full profile is up,
                    // and two overlapping descriptions of one person read as
                    // a glitch.
                    setHoverId(null);
                    setOpenId(a.id);
                  }}
                  aria-label={a.name}
                  className="block rounded-full"
                  style={{
                    boxShadow: lit
                      ? "0 0 0 3px var(--brand), 0 6px 18px -8px rgba(0,0,0,.45)"
                      : "0 0 0 2px var(--card), 0 6px 18px -10px rgba(0,0,0,.4)",
                    borderRadius: 999,
                  }}
                >
                  <Avatar name={a.name} size={34} />
                </button>
                {a.here && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--good)", boxShadow: "0 0 0 2px var(--card)" }}
                    title="In the room now"
                  />
                )}
                {hoverId === a.id && <Hover a={a} />}
              </span>
            </Marker>
          );
        })}

        {/* Zone labels last, so nothing is drawn over them, and anchored
            above the cluster rather than in its middle — a caption sitting
            under eighteen faces is a caption nobody reads. They do the job
            a floorplan would: the pile by the coffee is a pile by the
            coffee, not a rendering artefact. */}
        {Object.entries(ZONE_LABEL).map(([id, label]) => {
          const inZone = ATTENDEES.filter((a) => a.zone === id);
          if (inZone.length === 0) return null;
          const lng = inZone.reduce((s, a) => s + a.lng, 0) / inZone.length;
          const top = Math.max(...inZone.map((a) => a.lat));
          return (
            <Marker key={id} latitude={top} longitude={lng} anchor="bottom">
              <span
                className="pointer-events-none mb-2 block select-none whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] backdrop-blur"
                style={{
                  background: "color-mix(in srgb, var(--card) 72%, transparent)",
                  color: "color-mix(in srgb, var(--ink) 52%, transparent)",
                }}
              >
                {label} · {inZone.length}
              </span>
            </Marker>
          );
        })}

        {/* You, so the room has a centre to be read from. */}
        <Marker latitude={YOU.lat} longitude={YOU.lng} anchor="center">
          <span className="relative block">
            <span
              className="grid h-[38px] w-[38px] place-items-center rounded-full text-[11px] font-bold text-white"
              style={{ background: "var(--brand)", boxShadow: "0 0 0 3px var(--card), 0 8px 20px -8px rgba(0,0,0,.5)" }}
            >
              You
            </span>
          </span>
        </Marker>
      </MapGL>

      {/* ───────────────────────────────────────────────── the event bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
        <div
          className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border px-3 py-2.5 backdrop-blur"
          style={{ background: "color-mix(in srgb, var(--card) 92%, transparent)", borderColor: "var(--line)", boxShadow: "0 18px 40px -26px rgba(0,0,0,.5)" }}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold leading-tight">{EVENT.name}</span>
            <span className="block truncate text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
              {EVENT.room} · {EVENT.when}
            </span>
          </span>
          <span
            className="flex-none rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
            style={{ background: "color-mix(in srgb, var(--good) 14%, transparent)", color: "var(--good)" }}
          >
            {hereCount} in the room
          </span>
        </div>

        <div className="pointer-events-auto mx-auto mt-2 flex max-w-3xl flex-wrap items-center gap-1.5">
          <Chip on={hereOnly} onClick={() => setHereOnly((v) => !v)} tone="good">
            Here now
          </Chip>
          <Picker label="Looking for" value={ask} onChange={setAsk} />
          <Picker label="Can help with" value={offer} onChange={setOffer} tone="offer" />
          {(ask || offer || hereOnly) && (
            <button
              type="button"
              onClick={() => {
                setAsk(null);
                setOffer(null);
                setHereOnly(false);
              }}
              className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold underline"
              style={{ color: "var(--ink-soft)" }}
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-[11.5px] font-semibold" style={{ color: "var(--ink-soft)" }}>
            {shown.length} of {ATTENDEES.length}
          </span>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────── the panel */}
      <aside className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 sm:inset-y-auto sm:bottom-3 sm:left-auto sm:right-3 sm:w-[340px] sm:p-0">
        <div
          className="pointer-events-auto flex max-h-[46dvh] flex-col overflow-hidden rounded-2xl border backdrop-blur sm:max-h-[66dvh]"
          style={{ background: "color-mix(in srgb, var(--card) 94%, transparent)", borderColor: "var(--line)", boxShadow: "0 24px 54px -28px rgba(0,0,0,.6)" }}
        >
          <div className="flex flex-none gap-1 border-b p-1.5" style={{ borderColor: "var(--line)" }}>
            {([["matches", "For you"], ["feed", "Feed"], ["chat", "Chats"]] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPanel(id)}
                className="flex-1 rounded-xl py-1.5 text-[12px] font-semibold"
                style={
                  panel === id
                    ? { background: "color-mix(in srgb, var(--brand) 13%, transparent)", color: "var(--brand)" }
                    : { color: "var(--ink-soft)" }
                }
              >
                {label}
                {id === "matches" && ` ${matches.length}`}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
            {panel === "matches" && <Matches matches={matches} onOpen={setOpenId} onMessage={message} />}
            {panel === "feed" && <Feed />}
            {panel === "chat" && (
              <Chat
                who={chatWith}
                sent={chatWith ? sent[chatWith.id] ?? [] : []}
                draft={draft}
                setDraft={setDraft}
                onSend={send}
              />
            )}
          </div>
        </div>
      </aside>

      {open && <Profile a={open} onClose={() => setOpenId(null)} onMessage={() => message(open)} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── pieces */

function Hover({ a }: { a: Attendee }) {
  return (
    <span
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 block w-[232px] -translate-x-1/2 rounded-2xl border p-2.5 text-left"
      style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "0 20px 44px -22px rgba(0,0,0,.55)" }}
    >
      <span className="block truncate text-[12.5px] font-bold">{a.name}</span>
      <span className="block truncate text-[11px]" style={{ color: "var(--ink-soft)" }}>
        {a.role} · {a.company}
      </span>
      <Ask side="ask" text={a.ask} />
      <Ask side="offer" text={a.offer} />
    </span>
  );
}

function Ask({ side, text }: { side: "ask" | "offer"; text: string }) {
  const c = side === "ask" ? "var(--brand)" : "var(--good)";
  return (
    <span
      className="mt-1.5 block rounded-xl px-2 py-1.5"
      style={{ background: `color-mix(in srgb, ${c} 10%, transparent)` }}
    >
      <span className="block text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: c }}>
        {side === "ask" ? "Looking for" : "Can help with"}
      </span>
      <span className="block text-[11.5px] font-semibold leading-[1.3]">{text}</span>
    </span>
  );
}

function Chip({
  on,
  onClick,
  children,
  tone,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "good";
}) {
  const c = tone === "good" ? "var(--good)" : "var(--brand)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="rounded-full border px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur"
      style={
        on
          ? { background: c, borderColor: c, color: "#fff" }
          : { background: "color-mix(in srgb, var(--card) 88%, transparent)", borderColor: "var(--line)", color: "var(--ink)" }
      }
    >
      {children}
    </button>
  );
}

function Picker({
  label,
  value,
  onChange,
  tone,
}: {
  label: string;
  value: TopicId | null;
  onChange: (v: TopicId | null) => void;
  tone?: "offer";
}) {
  const c = tone === "offer" ? "var(--good)" : "var(--brand)";
  return (
    <span className="flex items-center gap-1 rounded-full border px-1 py-0.5 backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--card) 88%, transparent)", borderColor: "var(--line)" }}>
      <span className="pl-1.5 text-[10px] font-bold uppercase tracking-[0.07em]" style={{ color: c }}>
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as TopicId | null)}
        className="rounded-full bg-transparent py-1 pl-1 pr-1 text-[11.5px] font-semibold outline-none"
        style={{ color: "var(--ink)" }}
      >
        <option value="">Anything</option>
        {TOPICS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </span>
  );
}

function Matches({
  matches,
  onOpen,
  onMessage,
}: {
  matches: ReturnType<typeof matchesFor>;
  onOpen: (id: string) => void;
  onMessage: (a: Attendee) => void;
}) {
  if (matches.length === 0) {
    return <p className="p-2 text-[12px]" style={{ color: "var(--ink-soft)" }}>Nobody matches that filter. Clear it to see the room.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {matches.map((m) => (
        <li key={m.a.id} className="rounded-2xl border p-2.5" style={{ borderColor: "var(--line)" }}>
          <button type="button" onClick={() => onOpen(m.a.id)} className="flex w-full items-center gap-2 text-left">
            <Avatar name={m.a.name} size={30} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold">{m.a.name}</span>
              <span className="block truncate text-[11px]" style={{ color: "var(--ink-soft)" }}>
                {m.a.role} · {m.a.company}
              </span>
            </span>
            {m.a.here && (
              <span className="flex-none rounded-full px-1.5 py-0.5 text-[9.5px] font-bold"
                style={{ background: "color-mix(in srgb, var(--good) 14%, transparent)", color: "var(--good)" }}>
                Here
              </span>
            )}
          </button>
          <p className="mt-1.5 text-[11.5px] leading-[1.45]" style={{ color: "var(--ink-soft)" }}>
            {m.reason}
          </p>
          <button
            type="button"
            onClick={() => onMessage(m.a)}
            className="mt-2 w-full rounded-full py-1.5 text-[12px] font-semibold text-white"
            style={{ background: "var(--brand)" }}
          >
            Say hello
          </button>
        </li>
      ))}
    </ul>
  );
}

function Feed() {
  return (
    <ul className="flex flex-col gap-2.5">
      {FEED.map((p) => (
        <li key={p.id} className="flex gap-2">
          <Avatar name={p.who.name} size={26} />
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px]">
              <strong className="font-bold">{p.who.name}</strong>
              <span style={{ color: "var(--ink-soft)" }}> · {p.ago} ago</span>
            </span>
            <span className="mt-0.5 block text-[12px] leading-[1.45]">{p.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Chat({
  who,
  sent,
  draft,
  setDraft,
  onSend,
}: {
  who: Attendee | null;
  sent: string[];
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
}) {
  if (!who) {
    return (
      <p className="p-2 text-[12px]" style={{ color: "var(--ink-soft)" }}>
        Pick somebody from <strong>For you</strong> or the map and say hello. Messages here stay in this
        browser — it&rsquo;s a demo of the room, not a real inbox.
      </p>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-2 pb-2">
        <Avatar name={who.name} size={26} />
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-bold">{who.name}</span>
          <span className="block truncate text-[10.5px]" style={{ color: "var(--ink-soft)" }}>
            {who.here ? `In the room · ${ZONE_LABEL[who.zone]}` : "Registered, not here yet"}
          </span>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="rounded-2xl rounded-bl-sm p-2 text-[12px] leading-[1.45]" style={{ background: "var(--sunk)" }}>
          {who.ask
            ? `Hi — I'm looking for ${who.ask}. Saw you're here tonight.`
            : "Hi — good to see you here tonight."}
        </p>
        {sent.map((m, i) => (
          <p
            key={i}
            className="mt-1.5 ml-6 rounded-2xl rounded-br-sm p-2 text-[12px] leading-[1.45] text-white"
            style={{ background: "var(--brand)" }}
          >
            {m}
          </p>
        ))}
      </div>
      <form
        className="mt-2 flex flex-none gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Reply to ${who.name.split(" ")[0]}…`}
          className="min-w-0 flex-1 rounded-full border bg-transparent px-3 py-1.5 text-[12px] outline-none"
          style={{ borderColor: "var(--line)" }}
        />
        <button type="submit" className="flex-none rounded-full px-3 text-[12px] font-semibold text-white" style={{ background: "var(--brand)" }}>
          Send
        </button>
      </form>
    </div>
  );
}

function Profile({ a, onClose, onMessage }: { a: Attendee; onClose: () => void; onMessage: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--sunk) 55%, transparent)" }} />
      <div
        className="relative w-full max-w-[360px] rounded-3xl border p-4"
        style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "0 30px 70px -30px rgba(0,0,0,.65)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Avatar name={a.name} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-bold leading-tight">{a.name}</p>
            <p className="truncate text-[12px]" style={{ color: "var(--ink-soft)" }}>
              {a.role} · {a.company}
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: a.here ? "var(--good)" : "var(--ink-soft)" }}>
              {a.here ? `In the room · ${ZONE_LABEL[a.zone]}` : "Registered, not here yet"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.5]" style={{ color: "var(--ink-soft)" }}>
          {a.bio}
        </p>
        <Ask side="ask" text={a.ask} />
        <Ask side="offer" text={a.offer} />
        <button
          type="button"
          onClick={onMessage}
          className="mt-3 w-full rounded-full py-2 text-[13px] font-semibold text-white"
          style={{ background: "var(--brand)" }}
        >
          Say hello
        </button>
      </div>
    </div>
  );
}
