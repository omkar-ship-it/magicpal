"use client";

import { useState } from "react";
import Link from "next/link";
import { avatarUrl } from "@/lib/avatar";
import { mockConnectionCount, type MockEvent, type MockCompany } from "@/lib/prototypeData";
import { NETWORK_KIND_EMOJI, groupsForName, isClub, networksForName } from "@/lib/networks";

const MAX_NOTE = 300;

export type Drop = { label: string; expiresAt: string };
export type ConnectionStatus = "connected" | "pending" | "none";

export type Profile = {
  id: string;
  name: string;
  headline: string | null;
  company: string | null;
  bio: string | null;
  skills: string[];
  photoUrl: string | null;
  locationLabel: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  active: boolean;
  drop: Drop | null;
  /** Only present in "My Network" mode — /api/nearby doesn't compute these. */
  connectionStatus?: ConnectionStatus;
  connectionId?: string | null;
  /** True if *I* sent the pending request; false if they sent it to me. */
  mine?: boolean | null;
};

export type ConnState = {
  status: "connect" | "pending" | "accepted" | "declined";
  connectionId: string | null;
  /** A pending request that's waiting on *my* answer, not theirs. */
  incoming?: boolean;
};

/** Green/amber/orange status for a pin or avatar, derived from the same ConnState everywhere a person is rendered. */
export function pinStatusOf(c: ConnState | undefined): "connected" | "pending" | "new" {
  if (c?.status === "accepted") return "connected";
  if (c?.status === "pending") return "pending";
  return "new";
}

export function minutesLeft(expiresAt: string, now: number): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 60_000));
}

/** Small distances read naturally to one decimal; continental ones read better rounded with a thousands separator. */
export function formatDistance(km: number): string {
  return km < 100 ? `~${km.toFixed(1)}km away` : `~${Math.round(km).toLocaleString()}km away`;
}

export function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
      <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

export function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7M3 12h18" strokeLinecap="round" />
    </svg>
  );
}

/** A classical building silhouette — columns + pediment — distinct from Briefcase (a workplace) and Calendar (a one-off event). */
export function InstitutionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9.5 12 4l9 5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 9.5v9M8.5 9.5v9M15.5 9.5v9M19.5 9.5v9" strokeLinecap="round" />
      <path d="M3 20.5h18" strokeLinecap="round" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-6.9c0-1.65-.03-3.77-2.3-3.77-2.3 0-2.65 1.8-2.65 3.65V23h-4V8z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  );
}

/** Green = connected, amber = a pending request (either direction), orange = not yet connected. */
export type PinStatus = "connected" | "pending" | "new";
export function statusColor(status: PinStatus): string {
  if (status === "connected") return "var(--good)";
  if (status === "pending") return "var(--pending)";
  return "var(--status-new)";
}

export function Pin({
  photoUrl,
  seed,
  me,
  active,
  drop,
  highlighted,
  status,
}: {
  photoUrl: string | null;
  /** Used to generate a deterministic round avatar when there's no uploaded photo. */
  seed: string;
  me?: boolean;
  active?: boolean;
  drop?: boolean;
  highlighted?: boolean;
  /** Omitted for "me" — my own pin isn't rated against myself. */
  status?: PinStatus;
}) {
  const classes = ["pin", me ? "pin-me" : "", drop ? "pin-drop" : active ? "pin-active" : "", highlighted ? "pin-hover" : ""]
    .filter(Boolean)
    .join(" ");
  const bg = drop ? "var(--gold)" : me ? "var(--brand)" : statusColor(status ?? "new");
  const size = highlighted ? 46 : 38;
  const img = photoUrl ?? avatarUrl(seed);
  return (
    <div style={{ position: "relative" }}>
      <div className={classes} style={{ background: bg, width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" />
      </div>
      {!me && status === "connected" && (
        <span
          className="grid place-items-center rounded-full text-white"
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 15,
            height: 15,
            background: "var(--good)",
            border: "2px solid var(--card)",
          }}
          title="Connected"
        >
          <CheckIcon />
        </span>
      )}
      {!me && status === "pending" && (
        <span
          className="grid place-items-center rounded-full text-white"
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 15,
            height: 15,
            background: "var(--pending)",
            border: "2px solid var(--card)",
          }}
          title="Pending request"
        >
          <ClockIcon />
        </span>
      )}
    </div>
  );
}

export function DropBadge({ drop, now }: { drop: Drop; now: number }) {
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "var(--gold)" }}>
      <span className="pulse-dot" style={{ background: "var(--gold)" }} />
      “{drop.label}” · {minutesLeft(drop.expiresAt, now)}m left
    </p>
  );
}

function SocialLinks({ p }: { p: Profile }) {
  if (!p.linkedinUrl && !p.instagramUrl && !p.websiteUrl) return null;
  const linkCls =
    "grid h-7 w-7 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]";
  return (
    <div className="mt-2 flex items-center gap-1.5">
      {p.linkedinUrl && (
        <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className={linkCls} title="LinkedIn">
          <LinkedInIcon />
        </a>
      )}
      {p.instagramUrl && (
        <a href={p.instagramUrl} target="_blank" rel="noopener noreferrer" className={linkCls} title="Instagram">
          <InstagramIcon />
        </a>
      )}
      {p.websiteUrl && (
        <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className={linkCls} title="Website">
          <GlobeIcon />
        </a>
      )}
    </div>
  );
}

export function ActionButton({
  p,
  conn,
  onConnect,
  onRespond,
  canAct,
  detailed,
  note,
  onNoteChange,
  communityName,
}: {
  p: Profile;
  conn: ConnState | undefined;
  onConnect: (id: string, note?: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  canAct: boolean;
  /** The popup card shows a note field before connecting; the compact list row doesn't. */
  detailed?: boolean;
  note?: string;
  onNoteChange?: (v: string) => void;
  /** Set when this row is rendered inside a shared community's hub — swaps in a warmer, lower-friction connect CTA that auto-fills the (real) request note instead of asking a stranger to write one. */
  communityName?: string;
}) {
  if (!canAct) {
    return (
      <Link href="/login" className="btn btn-ghost btn-sm w-full">
        Sign in to connect
      </Link>
    );
  }
  if (!conn || conn.status === "connect") {
    if (communityName) {
      return (
        <button
          onClick={() => onConnect(p.id, `Hey — we're both in ${communityName}!`)}
          className="btn btn-primary btn-sm w-full"
        >
          Connect — fellow member
        </button>
      );
    }
    if (detailed) {
      return (
        <div className="flex flex-col gap-1.5">
          <input
            className="input text-[12.5px]"
            placeholder="Add a note (optional)"
            value={note ?? ""}
            onChange={(e) => onNoteChange?.(e.target.value.slice(0, MAX_NOTE))}
          />
          <button onClick={() => onConnect(p.id, note)} className="btn btn-primary btn-sm w-full">
            Connect
          </button>
        </div>
      );
    }
    return (
      <button onClick={() => onConnect(p.id)} className="btn btn-primary btn-sm w-full">
        Connect
      </button>
    );
  }
  if (conn.status === "pending" && conn.incoming) {
    return (
      <div className="flex gap-1.5">
        <button onClick={() => onRespond(p, false)} className="btn btn-ghost btn-sm flex-1">
          Decline
        </button>
        <button onClick={() => onRespond(p, true)} className="btn btn-primary btn-sm flex-1">
          Accept
        </button>
      </div>
    );
  }
  if (conn.status === "pending") {
    return (
      <button disabled className="btn btn-ghost btn-sm w-full">
        Request sent
      </button>
    );
  }
  if (conn.status === "accepted") {
    return (
      <Link href={conn.connectionId ? `/messages/${conn.connectionId}` : "/connections"} className="btn btn-primary btn-sm w-full">
        Message
      </Link>
    );
  }
  return (
    <button disabled className="btn btn-ghost btn-sm w-full">
      Not connected
    </button>
  );
}

/**
 * A person's affiliations: the networks they're in, then the groups/clubs
 * inside them. Each chip is a door into that entity's panel.
 */
function AffiliationChips({
  name,
  onOpenEntity,
  maxNetworks = 3,
}: {
  name: string;
  onOpenEntity?: (kind: "network" | "group", id: string) => void;
  maxNetworks?: number;
}) {
  const networks = networksForName(name);
  const groups = groupsForName(name);
  if (networks.length === 0 && groups.length === 0) return null;
  const shown = networks.slice(0, maxNetworks);
  const hidden = networks.length - shown.length;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {shown.map((n) => (
        <span
          key={n.id}
          className="skill-tag"
          onClick={onOpenEntity ? () => onOpenEntity("network", n.id) : undefined}
          style={{
            cursor: onOpenEntity ? "pointer" : undefined,
            background: "color-mix(in srgb, var(--layer-event) 14%, var(--card))",
            color: "var(--layer-event)",
          }}
          title={onOpenEntity ? `Open ${n.name}` : undefined}
        >
          {NETWORK_KIND_EMOJI[n.kind]} {n.name}
        </span>
      ))}
      {hidden > 0 && <span className="skill-tag">+{hidden} more</span>}
      {groups.slice(0, 2).map((g) => (
        <span
          key={g.id}
          className="skill-tag"
          onClick={onOpenEntity ? () => onOpenEntity("group", g.id) : undefined}
          style={{ cursor: onOpenEntity ? "pointer" : undefined }}
          title={onOpenEntity ? `Open ${g.name}` : undefined}
        >
          {isClub(g) ? "⛺" : "👥"} {g.name}
        </span>
      ))}
    </div>
  );
}

/** The rich card shown in a pinned/hovered map popup — name, bio, socials, and the connect/message action. */
export function ProfileCard({
  p,
  conn,
  now,
  canAct,
  note,
  onNoteChange,
  onConnect,
  onRespond,
  onOpenEntity,
}: {
  p: Profile;
  conn: ConnState | undefined;
  now: number;
  canAct: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onConnect: (id: string, note?: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  /** Lets an affiliation chip open that network/group's panel — omit to render chips as plain labels. */
  onOpenEntity?: (kind: "network" | "group", id: string) => void;
}) {
  const status = pinStatusOf(conn);
  return (
    <div className="w-72 p-3.5">
      <div className="flex items-start gap-3">
        <span
          className="avatar h-13 w-13 flex-none text-[16px]"
          style={{ width: 52, height: 52, background: `linear-gradient(135deg, ${statusColor(status)}, var(--brand-deep))` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photoUrl ?? avatarUrl(p.id)} alt="" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold leading-tight">{p.name}</p>
            {p.active && !p.drop && <span className="pulse-dot flex-none" title="Active recently" />}
          </div>
          {p.headline && <p className="truncate text-[12.5px] text-[var(--ink-soft)]">{p.headline}</p>}
          {p.company && <p className="truncate text-[12px] text-[var(--ink-soft)]">{p.company}</p>}
          <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{mockConnectionCount(p.id).toLocaleString()} connections</p>
        </div>
      </div>

      {status === "connected" && (
        <span
          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: "color-mix(in srgb, var(--good) 14%, var(--card))", color: "var(--good)" }}
        >
          <span className="grid h-3 w-3 place-items-center rounded-full text-white" style={{ background: "var(--good)" }}>
            <CheckIcon />
          </span>
          Connected
        </span>
      )}
      {status === "pending" && (
        <span
          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: "color-mix(in srgb, var(--pending) 16%, var(--card))", color: "var(--pending)" }}
        >
          <span className="grid h-3 w-3 place-items-center rounded-full text-white" style={{ background: "var(--pending)" }}>
            <ClockIcon />
          </span>
          {conn?.incoming ? "Wants to connect" : "Request pending"}
        </span>
      )}

      <AffiliationChips name={p.name} onOpenEntity={onOpenEntity} />

      <div className="mt-2 flex items-center gap-1 text-[11.5px] text-[var(--ink-soft)]">
        {p.locationLabel && <span className="truncate">{p.locationLabel}</span>}
        {p.locationLabel && <span>·</span>}
        <span className="flex-none">{formatDistance(p.distanceKm)}</span>
      </div>

      {p.drop && <DropBadge drop={p.drop} now={now} />}

      {p.bio && <p className="mt-2 line-clamp-3 text-[12.5px] leading-5 text-[var(--ink)]">{p.bio}</p>}

      {p.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {p.skills.slice(0, 6).map((s) => (
            <span key={s} className="skill-tag">
              {s}
            </span>
          ))}
        </div>
      )}

      <SocialLinks p={p} />

      <div className="mt-3 border-t border-[var(--line)] pt-3">
        <ActionButton p={p} conn={conn} onConnect={onConnect} onRespond={onRespond} canAct={canAct} detailed note={note} onNoteChange={onNoteChange} />
      </div>
    </div>
  );
}

/** Prototype-only popup for a mock event pin — no RSVP backend yet, so the button just confirms locally. */
export function EventCard({ ev }: { ev: MockEvent }) {
  const [rsvped, setRsvped] = useState(false);
  return (
    <div className="w-64 p-3.5">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
        style={{ background: "color-mix(in srgb, var(--layer-event) 14%, var(--card))", color: "var(--layer-event)" }}
      >
        <CalendarIcon /> Event
      </span>
      <p className="mt-1.5 text-[14.5px] font-semibold leading-tight">{ev.name}</p>
      <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{ev.dateLabel}</p>
      <p className="text-[12px] text-[var(--ink-soft)]">
        {ev.venue}, {ev.city}
      </p>
      <p className="mt-1.5 text-[11.5px] text-[var(--ink-soft)]">{ev.attendeesMock} people attending</p>
      <button
        onClick={() => setRsvped((v) => !v)}
        className={rsvped ? "btn btn-ghost btn-sm mt-3 w-full" : "btn btn-primary btn-sm mt-3 w-full"}
      >
        {rsvped ? "You're going ✓" : "RSVP"}
      </button>
    </div>
  );
}

/** Prototype-only popup for a mock company pin — "people here" is a real count over the loaded nearby list, everything else is mock. */
export function CompanyCard({ co, peopleHere }: { co: MockCompany; peopleHere: number }) {
  const [following, setFollowing] = useState(false);
  return (
    <div className="w-60 p-3.5">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
        style={{ background: "color-mix(in srgb, var(--layer-company) 14%, var(--card))", color: "var(--layer-company)" }}
      >
        <BriefcaseIcon /> Company
      </span>
      <p className="mt-1.5 text-[14.5px] font-semibold leading-tight">{co.name}</p>
      <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
        {co.industry} · {co.city}
      </p>
      {peopleHere > 0 && (
        <p className="mt-1.5 text-[11.5px] text-[var(--ink-soft)]">
          {peopleHere} {peopleHere === 1 ? "person" : "people"} here in your network view
        </p>
      )}
      <button
        onClick={() => setFollowing((v) => !v)}
        className={following ? "btn btn-ghost btn-sm mt-3 w-full" : "btn btn-primary btn-sm mt-3 w-full"}
      >
        {following ? "Following ✓" : "Follow"}
      </button>
    </div>
  );
}

export function ProfileListRow({
  p,
  conn,
  hoveredId,
  now,
  canAct,
  onHover,
  onUnhover,
  onConnect,
  onRespond,
  onOpenEntity,
  communityName,
}: {
  p: Profile;
  conn: ConnState | undefined;
  hoveredId: string | null;
  now: number;
  canAct: boolean;
  onHover: (id: string) => void;
  onUnhover: (id: string) => void;
  onConnect: (id: string, note?: string) => void;
  onRespond: (p: Profile, accept: boolean) => void;
  /** Lets an affiliation chip open that network/group's panel — omit to render chips as plain labels. */
  onOpenEntity?: (kind: "network" | "group", id: string) => void;
  /** Set inside a Community Hub's member list — gives ActionButton the warmer "fellow member" connect CTA. */
  communityName?: string;
}) {
  const status = pinStatusOf(conn);
  return (
    <div
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onUnhover(p.id)}
      className="card flex cursor-pointer gap-3 p-3 transition-colors"
      style={hoveredId === p.id ? { borderColor: "var(--brand)", background: "var(--sunk)" } : undefined}
    >
      <span className="avatar h-11 w-11 flex-none text-[13px]" style={{ background: `linear-gradient(135deg, ${statusColor(status)}, var(--brand-deep))` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.photoUrl ?? avatarUrl(p.id)} alt="" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13.5px] font-semibold leading-tight">{p.name}</p>
          {p.active && !p.drop && <span className="pulse-dot flex-none" title="Active recently" />}
          {status === "connected" && (
            <span
              className="flex flex-none items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold"
              style={{ background: "color-mix(in srgb, var(--good) 14%, var(--card))", color: "var(--good)" }}
            >
              <span className="grid h-2.5 w-2.5 place-items-center rounded-full text-white" style={{ background: "var(--good)" }}>
                <CheckIcon />
              </span>
              Connected
            </span>
          )}
          {status === "pending" && (
            <span
              className="flex flex-none items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold"
              style={{ background: "color-mix(in srgb, var(--pending) 16%, var(--card))", color: "var(--pending)" }}
            >
              <span className="grid h-2.5 w-2.5 place-items-center rounded-full text-white" style={{ background: "var(--pending)" }}>
                <ClockIcon />
              </span>
              Pending
            </span>
          )}
        </div>
        {p.headline && <p className="truncate text-[12px] text-[var(--ink-soft)]">{p.headline}</p>}
        {p.locationLabel && <p className="truncate text-[11px] text-[var(--ink-soft)]">{p.locationLabel}</p>}
        <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
          {formatDistance(p.distanceKm)} · {mockConnectionCount(p.id).toLocaleString()} connections
        </p>
        {p.drop && <DropBadge drop={p.drop} now={now} />}
        {!communityName && <AffiliationChips name={p.name} onOpenEntity={onOpenEntity} maxNetworks={2} />}
        {p.skills.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {p.skills.slice(0, 3).map((s) => (
              <span key={s} className="skill-tag">
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2">
          <ActionButton p={p} conn={conn} onConnect={onConnect} onRespond={onRespond} canAct={canAct} communityName={communityName} />
        </div>
      </div>
    </div>
  );
}
